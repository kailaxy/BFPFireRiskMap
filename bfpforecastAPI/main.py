from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
import time
import warnings
from datetime import datetime

try:
    # Optional heavy import; if missing ARIMA method will not be available
    from statsmodels.tsa.arima.model import ARIMA  # type: ignore
    from statsmodels.tools.sm_exceptions import ConvergenceWarning  # type: ignore
    STATS_MODELS_AVAILABLE = True
    STATS_MODELS_IMPORT_ERROR = None
except Exception as e:
    STATS_MODELS_AVAILABLE = False
    STATS_MODELS_IMPORT_ERROR = str(e)
    ConvergenceWarning = Warning

app = FastAPI(title="Forecast Microservice", version="0.1.0")

class ForecastRequest(BaseModel):
    series: List[float] = Field(..., description="Historical time series values in order")
    horizon: int = Field(7, description="Number of future steps to forecast")
    method: str = Field("naive", description="Forecast method: naive|moving_average|arima")
    moving_average_window: int = Field(3, description="Window size for moving_average method")
    arima_order: Optional[List[int]] = Field(default=None, description="ARIMA order [p,d,q] if method=arima")

class ForecastResponse(BaseModel):
    forecast: List[float]
    method_used: str
    input_length: int

class HistoricalRow(BaseModel):
    barangay: str
    date: str
    incident_count: float

class BatchForecastRequest(BaseModel):
    historical_data: List[HistoricalRow]
    start_year: int
    start_month: int

class BatchForecastItem(BaseModel):
    barangay_name: str
    month: int
    year: int
    predicted_cases: float
    lower_bound: float
    upper_bound: float
    risk_level: str
    risk_flag: Optional[str] = None
    model_used: str

class BatchForecastResponse(BaseModel):
    all_forecasts: List[BatchForecastItem]
    start_year: int
    start_month: int
    total_months: int
    total_predictions: int
    barangays_count: int

@app.get("/health")
async def health():
    payload = {
        "status": "ok",
        "statsmodels_available": STATS_MODELS_AVAILABLE,
    }
    if not STATS_MODELS_AVAILABLE and STATS_MODELS_IMPORT_ERROR:
        # Keep health output compact while surfacing the root import problem.
        payload["import_error"] = STATS_MODELS_IMPORT_ERROR[:160]
    return payload

@app.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    data = req.series
    if not data:
        raise HTTPException(status_code=400, detail="Series cannot be empty")
    horizon = req.horizon
    method = req.method.lower()

    if horizon <= 0:
        raise HTTPException(status_code=400, detail="Horizon must be positive")

    if method == "naive":
        last_val = data[-1]
        fc = [last_val] * horizon
        return ForecastResponse(forecast=fc, method_used="naive", input_length=len(data))

    if method == "moving_average":
        w = max(1, req.moving_average_window)
        if len(data) < w:
            raise HTTPException(status_code=400, detail="Series shorter than moving_average_window")
        avg = float(np.mean(data[-w:]))
        fc = [avg] * horizon
        return ForecastResponse(forecast=fc, method_used=f"moving_average(w={w})", input_length=len(data))

    if method == "arima":
        if not STATS_MODELS_AVAILABLE:
            raise HTTPException(status_code=400, detail="statsmodels not installed in this image")
        order = tuple(req.arima_order) if req.arima_order else (1, 1, 1)
        try:
            model = ARIMA(data, order=order)
            fitted = model.fit()
            fc = fitted.forecast(steps=horizon)
            return ForecastResponse(forecast=[float(x) for x in fc], method_used=f"arima{order}", input_length=len(data))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"ARIMA failure: {e}")

    raise HTTPException(status_code=400, detail="Unsupported method")

# To run locally: `uvicorn main:app --reload --port 8001`


def _parse_to_month(x: str):
    try:
        return pd.Period(str(x), freq='M').to_timestamp()
    except Exception:
        dt = pd.to_datetime(str(x), errors='coerce')
        if pd.isna(dt):
            return pd.NaT
        return dt.to_period('M').to_timestamp()

def _categorize_risk(predicted: float, lower: float, upper: float):
    if predicted >= 1:
        risk_level = "High"
    elif predicted >= 0.5:
        risk_level = "Medium"
    elif predicted >= 0.2:
        risk_level = "Low-Moderate"
    else:
        risk_level = "Very Low"
    if upper >= 3:
        risk_flag = "Elevated Risk"
    elif upper >= 2:
        risk_flag = "Watchlist"
    else:
        risk_flag = None
    return risk_level, risk_flag

@app.post("/forecast12", response_model=BatchForecastResponse)
async def forecast_12_months(req: BatchForecastRequest):
    try:
        if not STATS_MODELS_AVAILABLE:
            raise HTTPException(status_code=500, detail="statsmodels not installed in this image")
        hist = pd.DataFrame([h.model_dump() for h in req.historical_data])
        if hist.empty:
            raise HTTPException(status_code=400, detail="historical_data cannot be empty")
        hist['DATE_TS'] = hist['date'].apply(_parse_to_month)
        hist = hist.dropna(subset=['DATE_TS'])

        # target periods: 12 months from start
        target_periods = []
        y = req.start_year
        m = req.start_month
        for _ in range(12):
            target_periods.append((y, m))
            m += 1
            if m > 12:
                m = 1
                y += 1

        results: List[Dict[str, Any]] = []

        # Create global time range from earliest to latest data across all barangays
        global_min_date = hist['DATE_TS'].min()
        global_max_date = hist['DATE_TS'].max()

        for barangay, g in hist.groupby('barangay'):
            g = g.sort_values('DATE_TS')
            s = g.groupby('DATE_TS')['incident_count'].sum().astype(float)
            if s.empty:
                continue
            # Use global date range instead of per-barangay range
            full_index = pd.date_range(start=global_min_date, end=global_max_date, freq='MS')
            s = s.reindex(full_index, fill_value=0).astype(float)
            s.index.freq = 'MS'

            last_period = pd.Period(s.index.max(), freq='M')
            furthest_target = pd.Period(f"{target_periods[-1][0]}-{target_periods[-1][1]:02d}", freq='M')
            max_steps = int((furthest_target - last_period).n)
            if max_steps <= 0:
                max_steps = 12

            forecast_series = pd.Series(dtype=float)
            forecast_ci = pd.DataFrame()

            nonzero_counts = (s != 0).sum()
            model_used = None

            if len(s) < 6 or nonzero_counts < 3:
                model_used = "Mean Fallback (Insufficient Data)"
                fallback = float(s.mean())
                forecast_index = pd.date_range(start=s.index.max() + pd.offsets.MonthBegin(), periods=max_steps, freq='MS')
                forecast_series = pd.Series(np.repeat(fallback, max_steps), index=forecast_index)
                std = float(s.std())
                forecast_ci = pd.DataFrame({'lower': forecast_series - std, 'upper': forecast_series + std}, index=forecast_index)
            else:
                fallback_reason = None
                forecast_index = pd.date_range(start=s.index.max() + pd.offsets.MonthBegin(), periods=max_steps, freq='MS')
                ylog = np.log1p(s)
                order = (1, 0, 1)
                fit_started = time.monotonic()

                try:
                    with warnings.catch_warnings(record=True) as fit_warnings:
                        warnings.simplefilter("always", ConvergenceWarning)
                        fitted = ARIMA(
                            ylog,
                            order=order,
                            enforce_stationarity=False,
                            enforce_invertibility=False,
                        ).fit(method_kwargs={'maxiter': 60})

                    fit_elapsed = time.monotonic() - fit_started
                    converged = True
                    if hasattr(fitted, 'mle_retvals') and fitted.mle_retvals:
                        converged = fitted.mle_retvals.get('converged', True)
                    has_convergence_warning = any(issubclass(w.category, ConvergenceWarning) for w in fit_warnings)

                    if fit_elapsed > 2.0:
                        fallback_reason = "Mean Fallback (Fit Timeout)"
                    elif not converged or has_convergence_warning:
                        fallback_reason = "Mean Fallback (Unstable Fit)"
                    else:
                        fc_obj = fitted.get_forecast(steps=max_steps)
                        fc = fc_obj.predicted_mean
                        forecast_series = pd.Series(np.expm1(fc.values), index=forecast_index)
                        ci = fc_obj.conf_int(alpha=0.05)
                        ci.index = forecast_index
                        forecast_ci = pd.DataFrame({'lower': np.expm1(ci.iloc[:, 0]), 'upper': np.expm1(ci.iloc[:, 1])}, index=forecast_index)
                        model_used = f"ARIMA{order}"
                except Exception:
                    fallback_reason = "Mean Fallback (Fit Failed)"

                if fallback_reason is not None:
                    model_used = fallback_reason
                    fallback = float(s.mean())
                    forecast_series = pd.Series(np.repeat(fallback, max_steps), index=forecast_index)
                    std = float(s.std())
                    forecast_ci = pd.DataFrame({'lower': forecast_series - std, 'upper': forecast_series + std}, index=forecast_index)

            for ty, tm in target_periods:
                target_period = pd.Period(f"{ty}-{tm:02d}", freq='M')
                target_ts = target_period.to_timestamp()
                if target_ts in forecast_series.index:
                    predicted_val = float(forecast_series.loc[target_ts])
                    lower_val = float(forecast_ci.loc[target_ts, 'lower'])
                    upper_val = float(forecast_ci.loc[target_ts, 'upper'])
                else:
                    meanv = float(s.mean())
                    stdv = float(s.std())
                    predicted_val = meanv
                    lower_val = meanv - stdv
                    upper_val = meanv + stdv
                predicted_val = max(0.0, predicted_val)
                lower_val = max(0.0, lower_val)
                upper_val = max(0.0, upper_val)
                risk_level, risk_flag = _categorize_risk(predicted_val, lower_val, upper_val)
                results.append({
                    'barangay_name': barangay,
                    'month': tm,
                    'year': ty,
                    'predicted_cases': round(predicted_val, 3),
                    'lower_bound': round(lower_val, 3),
                    'upper_bound': round(upper_val, 3),
                    'risk_level': risk_level,
                    'risk_flag': risk_flag,
                    'model_used': model_used,
                })

        return BatchForecastResponse(
            all_forecasts=[BatchForecastItem(**r) for r in results],
            start_year=req.start_year,
            start_month=req.start_month,
            total_months=12,
            total_predictions=len(results),
            barangays_count=len(set(r['barangay_name'] for r in results))
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "forecast12_unexpected_error",
                "message": str(e),
            },
        )
