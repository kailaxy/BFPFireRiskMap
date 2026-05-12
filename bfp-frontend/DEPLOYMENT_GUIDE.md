# bfp-frontend Deployment Guide (Connected Setup)

This guide deploys the frontend and ensures it is correctly connected to `bfp-backend`.

## 1) Connection Contract

Use canonical production URLs:

- `FRONTEND_URL=https://bfp-frontend.onrender.com`
- `BACKEND_URL=https://bfp-backend.onrender.com`

Frontend must resolve API base URL to `${BACKEND_URL}`.

## 2) API URL Resolution (important)

Frontend runtime supports these sources, in priority order:
1. `VITE_API_BASE_URL`
2. `REACT_APP_API_URL`
3. `window.__BFP_API_BASE_URL`
4. `<meta name="api-base-url" ...>`
5. fallback `http://localhost:5000`

Current `index.html` already sets a runtime meta tag and script default to Render backend.

## 3) Required Environment Variables

Set in Render Static Site settings:

- `VITE_API_BASE_URL=${BACKEND_URL}`
- `REACT_APP_API_URL=${BACKEND_URL}` (compatibility; optional but recommended)

## 4) Deploy Steps

1. Build frontend:

```bash
npm ci
npm run build
```

2. Deploy static output (`dist/`) to Render.
3. Confirm env vars are applied in target environment.

## 5) Browser Validation

After deploy, verify:

- Frontend loads at `${FRONTEND_URL}`
- Network calls go to `${BACKEND_URL}`
- Critical API flows succeed:
  - `/api/barangays`
  - `/api/forecasts/latest`
  - `/api/active_fires`

## 6) CORS Compatibility Note

Backend currently allows `https://bfp-frontend.onrender.com` origin.
If frontend host/domain changes, backend CORS allowlist must be updated before cutover.

## 7) Quick Validation Commands

```bash
curl https://bfp-frontend.onrender.com
curl -H "Origin: https://bfp-frontend.onrender.com" -X OPTIONS https://bfp-backend.onrender.com/api/forecasts/latest
curl -H "Origin: https://bfp-frontend.onrender.com" https://bfp-backend.onrender.com/api/forecasts/latest
```

Expected:
- frontend returns `200`
- preflight + GET include `Access-Control-Allow-Origin: https://bfp-frontend.onrender.com`
