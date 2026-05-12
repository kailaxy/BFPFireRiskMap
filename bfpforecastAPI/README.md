# Forecast Microservice (FastAPI)

Provides simple time-series forecasts (naive, moving average, optional ARIMA) via a REST endpoint.

## Local Development
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
Endpoint: `POST http://localhost:8001/forecast`
```json
{
  "series": [10,11,13,15,14,16],
  "horizon": 5,
  "method": "moving_average",
  "moving_average_window": 3
}
```

## Deploy with Google Cloud Console (Cloud Run) — No SDK Needed

### 1. Create / Select Project
1. Go to https://console.cloud.google.com/
2. Top navigation: click project dropdown -> "New Project" (name e.g. `bfp-forecast`). Note the Project ID.
3. Ensure Billing is enabled (Billing section). Cloud Run requires billing (even for free tier usage tracking).

### 2. Enable Required APIs
Navigate to "APIs & Services" > "Enable APIs and Services" and enable:
- Cloud Run Admin API
- Artifact Registry API
- Cloud Build API
- (Optional) Secret Manager API if you will store secrets

### 3. Create Artifact Registry Repository (Container Images)
1. Go to "Artifact Registry" > "Repositories" > "Create Repository".
2. Type: `Docker` | Location: choose region close to users (e.g. `asia-southeast1`).
3. Name: `forecast-service`.

### 4. Connect Source (GitHub) for Automated Build (Recommended)
1. Go to "Cloud Build" > "Triggers" > "Create Trigger".
2. Connect GitHub (if first time, authorize installation) and select repository containing this folder.
3. Event: "Push to branch" (e.g. `main`).
4. Build Configuration: "Cloud Build configuration file (yaml or json)" and set Filename to `cloudbuild.yaml`.
5. Substitution variables:
  - `_REGION` = your region (e.g. `asia-southeast1`)
  - `_REPO` = `forecast-service` (or your Artifact Registry repo name)
  - `_IMAGE` = `forecast-microservice`
6. Save trigger. Push a commit (or click "Run" on the trigger) to start the first build.

(Alternative Manual Build Without Trigger)
- Use Cloud Shell (top right icon) then:
```bash
git clone <repo-url> && cd bfpforecastAPI
gcloud builds submit --region=asia-southeast1 --tag=asia-southeast1-docker.pkg.dev/PROJECT_ID/forecast-service/forecast-microservice:latest
```
(Requires gcloud; avoids local install.)

### 5. Deploy to Cloud Run via Console
1. Go to "Cloud Run" > "Create Service".
2. Select the built image from Artifact Registry.
3. Service name: `forecast-microservice`.
4. Region: same as repository.
5. CPU/Memory: start with 1 vCPU / 512Mi.
6. Autoscaling: min 0, max e.g. 3.
7. Ingress: choose "Allow all" initially (later restrict with IAM).
8. Authentication: if calling from public internet, choose "Allow unauthenticated" for quick start; for secure internal calls choose "Require authentication".
9. Environment Variables: (Add any future config like `MODEL_TYPE`, `TIMEOUT_MS`). Leave blank now.
10. Deploy. Note the URL shown after completion (e.g. `https://forecast-microservice-<hash>-uc.a.run.app`).

### 6. (Optional) Secure the Service
- For internal-only calls: set Ingress to "Internal" or require auth.
- Create a Service Account: "IAM & Admin" > "Service Accounts" > New (`forecast-client`), grant role `Cloud Run Invoker`.
- Generate Key (JSON) if backend needs direct service-to-service with signed JWT OR use Identity Token from metadata server if deployed in GCP.

### 7. Add Observability
- Enable Cloud Logging & Cloud Monitoring automatically enabled.
- For request metrics view "Cloud Run" > select service > "Metrics".

### 8. Update Node Backend to Call Microservice
In `bfp-backend` create a new config entry (example):
```js
// config/forecastService.js
module.exports = {
  baseUrl: process.env.FORECAST_SERVICE_URL || 'http://localhost:8001'
};
```
Service wrapper pattern:
```js
// services/forecastClient.js
const fetch = require('node-fetch');
const { baseUrl } = require('../config/forecastService');
async function getForecast(series, options = {}) {
  const body = { series, horizon: options.horizon || 7, method: options.method || 'naive' };
  const res = await fetch(`${baseUrl}/forecast`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Forecast error ${res.status}: ${detail}`);
  }
  return res.json();
}
module.exports = { getForecast };
```
Add env var: `FORECAST_SERVICE_URL=https://forecast-microservice-<hash>-uc.a.run.app` in your deployment.

### 9. Retry / Resilience (Optional)
Use exponential backoff (3 retries) and circuit breaker if high volume.

### 10. Future Enhancements
- Swap naive for real ARIMA or Prophet model.
- Add batch endpoint accepting multiple series.
- Add `/models` endpoint to list supported algorithms.
- Add authentication (OIDC / API key). 

## API Summary
`GET /health` -> `{ "status": "ok" }`
`POST /forecast` -> `{ "forecast": [...], "method_used": "...", "input_length": N }`

## Removing ARIMA Dependency
If container size matters, remove statsmodels: delete import block and remove it from `requirements.txt`, or build two images (lite vs full).

## Troubleshooting
- Build fails: check Cloud Build logs for missing system libs.
- 403 invoking service: ensure unauthenticated access allowed or correct IAM role `Cloud Run Invoker` assigned.
- High cold start latency: consider min instances > 0.
