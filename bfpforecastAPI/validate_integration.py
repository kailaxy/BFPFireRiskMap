#!/usr/bin/env python3
"""
validate_forecasting_api_integration.py
Test forecasting API endpoints and data dependencies for cross-repo compatibility.
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional

API_BASE_URL = os.getenv('FORECAST_API_URL', 'http://localhost:8001')
BACKEND_URL = os.getenv('API_BASE_URL', 'http://localhost:5000')
PROVIDER = os.getenv('DATA_PROVIDER', 'postgres')

results = {
    'provider': PROVIDER,
    'timestamp': datetime.now().isoformat(),
    'api_url': API_BASE_URL,
    'backend_url': BACKEND_URL,
    'tests': [],
    'summary': {
        'total': 0,
        'passed': 0,
        'failed': 0,
        'warnings': 0
    },
    'dependencies': {
        'forecasts_table': None,
        'historical_fires_table': None,
        'barangays_reference': None
    }
}

def test_endpoint(
    name: str,
    method: str,
    path: str,
    url_base: str = API_BASE_URL,
    expected_status: Any = 200,
    json_body: Optional[Dict] = None,
    headers: Optional[Dict] = None,
) -> bool:
    """Test a single API endpoint."""
    results['summary']['total'] += 1
    full_url = f"{url_base}{path}"
    
    print(f"\n► Testing: {name}")
    print(f"  {method} {path}")
    
    try:
        if method == 'GET':
            response = requests.get(full_url, timeout=5, headers=headers or {})
        elif method == 'POST':
            response = requests.post(full_url, json=json_body, timeout=5, headers=headers or {})
        else:
            print(f"  ⚠️ Unsupported method: {method}")
            results['summary']['warnings'] += 1
            return False

        # Handle multiple acceptable statuses
        if isinstance(expected_status, list):
            passed = response.status_code in expected_status
        else:
            passed = response.status_code == expected_status

        test_record = {
            'name': name,
            'method': method,
            'path': path,
            'expected_status': expected_status,
            'actual_status': response.status_code,
            'passed': passed,
            'response_size': len(response.text),
        }

        if passed:
            print(f"  ✅ Status: {response.status_code}")
            results['summary']['passed'] += 1
            
            # Try to parse and log response structure
            try:
                data = response.json()
                if isinstance(data, dict):
                    keys = list(data.keys())
                    print(f"  📦 Response keys: {', '.join(keys[:5])}{' ...' if len(keys) > 5 else ''}")
                    test_record['response_keys'] = keys
                elif isinstance(data, list):
                    print(f"  📦 Response: list of {len(data)} items")
                    test_record['response_count'] = len(data)
            except:
                print(f"  📦 Response: {response.text[:100]}...")
        else:
            print(f"  ❌ Status: {response.status_code} (expected {expected_status})")
            if response.text:
                error_msg = response.text[:200]
                print(f"  Error: {error_msg}")
                test_record['error'] = error_msg
            results['summary']['failed'] += 1

        results['tests'].append(test_record)
        return passed

    except requests.RequestException as e:
        print(f"  ⚠️ Request failed: {str(e)}")
        results['summary']['failed'] += 1
        results['tests'].append({
            'name': name,
            'method': method,
            'path': path,
            'error': str(e),
            'passed': False
        })
        return False


def test_forecast_api():
    """Test forecasting API endpoints."""
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║         TESTING FORECASTING API ENDPOINTS                ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Test health endpoint
    test_endpoint(
        'GET /health - API health check',
        'GET',
        '/health',
        url_base=API_BASE_URL,
        expected_status=[200, 503]
    )
    
    # Test simple forecast endpoint with minimal data
    test_endpoint(
        'POST /forecast - Simple time series forecast',
        'POST',
        '/forecast',
        url_base=API_BASE_URL,
        expected_status=[200, 400],
        json_body={
            'series': [10.0, 11.0, 12.0, 11.5, 12.5, 13.0],
            'horizon': 3,
            'method': 'naive'
        }
    )
    
    # Test batch forecast with moving average
    test_endpoint(
        'POST /forecast - Moving average method',
        'POST',
        '/forecast',
        url_base=API_BASE_URL,
        expected_status=[200, 400],
        json_body={
            'series': [1.0, 2.0, 3.0, 4.0, 5.0],
            'horizon': 2,
            'method': 'moving_average',
            'moving_average_window': 2
        }
    )
    
    # Test 12-month batch forecast if historical data available
    test_endpoint(
        'POST /forecast12 - 12-month batch forecast (optional)',
        'POST',
        '/forecast12',
        url_base=API_BASE_URL,
        expected_status=[200, 400, 422],
        json_body={
            'historical_data': [
                {'barangay': 'TestBarangay', 'date': '2023-01-01', 'incident_count': 5.0},
                {'barangay': 'TestBarangay', 'date': '2023-02-01', 'incident_count': 6.0},
            ],
            'start_year': 2024,
            'start_month': 1
        }
    )


def check_backend_dependencies():
    """Check if backend has the data needed by forecasting API."""
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║      CHECKING BACKEND DATA DEPENDENCIES                   ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Check forecasts endpoint
    print(f"\n► Checking: Forecasts data availability ({PROVIDER} provider)")
    try:
        resp = requests.get(f"{BACKEND_URL}/api/forecasts/latest", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data) if isinstance(data, list) else (len(data.get('rows', [])) if isinstance(data, dict) else 0)
            print(f"  ✅ Forecasts available: {count} forecasts")
            results['dependencies']['forecasts_table'] = count
        else:
            print(f"  ⚠️ Forecasts endpoint returned {resp.status_code}")
            results['dependencies']['forecasts_table'] = None
    except Exception as e:
        print(f"  ❌ Cannot reach forecasts endpoint: {str(e)}")
        results['dependencies']['forecasts_table'] = None

    # Check historical fires endpoint
    print(f"\n► Checking: Historical fires data availability ({PROVIDER} provider)")
    try:
        resp = requests.get(f"{BACKEND_URL}/api/incidentsHistory", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            # Handle GeoJSON FeatureCollection
            if isinstance(data, dict) and 'features' in data:
                count = len(data['features'])
            elif isinstance(data, list):
                count = len(data)
            else:
                count = 0
            print(f"  ✅ Historical fires available: {count} records")
            results['dependencies']['historical_fires_table'] = count
        else:
            print(f"  ⚠️ Historical fires endpoint returned {resp.status_code}")
            results['dependencies']['historical_fires_table'] = None
    except Exception as e:
        print(f"  ❌ Cannot reach historical fires endpoint: {str(e)}")
        results['dependencies']['historical_fires_table'] = None

    # Check barangays
    print(f"\n► Checking: Barangays reference data ({PROVIDER} provider)")
    try:
        resp = requests.get(f"{BACKEND_URL}/api/barangays", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data) if isinstance(data, list) else (len(data.get('rows', [])) if isinstance(data, dict) else 0)
            print(f"  ✅ Barangays available: {count} barangays")
            results['dependencies']['barangays_reference'] = count
        else:
            print(f"  ⚠️ Barangays endpoint returned {resp.status_code}")
            results['dependencies']['barangays_reference'] = None
    except Exception as e:
        print(f"  ❌ Cannot reach barangays endpoint: {str(e)}")
        results['dependencies']['barangays_reference'] = None


def print_summary():
    """Print validation summary."""
    print("\n")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                 VALIDATION SUMMARY                        ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"Provider:              {PROVIDER.upper()}")
    print(f"Forecast API:          {API_BASE_URL}")
    print(f"Backend API:           {BACKEND_URL}")
    print(f"\nAPI Tests:             {results['summary']['total']} total")
    print(f"  ✅ Passed:           {results['summary']['passed']}")
    print(f"  ❌ Failed:           {results['summary']['failed']}")
    print(f"  ⚠️  Warnings:        {results['summary']['warnings']}")
    
    if results['summary']['total'] > 0:
        pass_rate = int((results['summary']['passed'] / results['summary']['total']) * 100)
        print(f"Pass Rate:             {pass_rate}%")
    
    print(f"\nDependencies:")
    print(f"  Forecasts:           {results['dependencies']['forecasts_table'] or 'Unavailable'}")
    print(f"  Historical Fires:    {results['dependencies']['historical_fires_table'] or 'Unavailable'}")
    print(f"  Barangays Reference: {results['dependencies']['barangays_reference'] or 'Unavailable'}")
    
    # Readiness assessment
    all_deps_available = all(v is not None for v in results['dependencies'].values())
    api_working = results['summary']['failed'] == 0
    
    print(f"\n📊 Readiness:")
    if api_working:
        print(f"  ✅ Forecast API is responsive")
    else:
        print(f"  ❌ Forecast API has issues; check connectivity")
    
    if all_deps_available:
        print(f"  ✅ All backend data dependencies available in {PROVIDER} mode")
    else:
        unavailable = [k for k, v in results['dependencies'].items() if v is None]
        print(f"  ⚠️  Some dependencies unavailable: {', '.join(unavailable)}")


def write_results():
    """Save results to JSON file."""
    import os
    results_dir = '.apm/test_results'
    os.makedirs(results_dir, exist_ok=True)
    
    filename = f"{results_dir}/forecast_api_integration_{PROVIDER}_{int(datetime.now().timestamp())}.json"
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📄 Results saved to: {filename}")
    return filename


def main():
    """Run all validation tests."""
    print(f"╔════════════════════════════════════════════════════════════╗")
    print(f"║  FORECASTING API CROSS-REPO INTEGRATION VALIDATION         ║")
    print(f"╚════════════════════════════════════════════════════════════╝")
    print(f"\nProvider Mode: {PROVIDER.upper()}")
    print(f"Forecast API:  {API_BASE_URL}")
    print(f"Backend API:   {BACKEND_URL}")
    
    test_forecast_api()
    check_backend_dependencies()
    print_summary()
    write_results()
    
    # Exit with error code if critical tests failed
    critical_failed = any(t for t in results['tests'] if not t.get('passed', False) and 'health' in t.get('name', '').lower())
    sys.exit(1 if critical_failed else 0)


if __name__ == '__main__':
    main()
