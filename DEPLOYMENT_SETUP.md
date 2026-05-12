# BFP Fire Risk Map - Deployment Setup Guide

This guide provides step-by-step instructions to set up and deploy each component of the BFP Fire Risk Map system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Forecast API Setup](#forecast-api-setup)
6. [Running Locally](#running-locally)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Global Requirements

- **Node.js 18+**: Download from https://nodejs.org
- **Python 3.8+**: Download from https://www.python.org
- **Git**: For version control (recommended)
- **PostgreSQL 13+** OR **Supabase account**: For database
- **Google API Key**: For Maps and Geocoding (https://console.cloud.google.com)

### Verification

```bash
node --version      # Should be v18.x or higher
npm --version       # Should be 9.x or higher
python --version    # Should be 3.8 or higher
```

---

## Environment Configuration

### Step 1: Obtain Credentials

#### Database (PostgreSQL / Supabase)

**Option A: Supabase (Recommended for this project)**
1. Go to https://supabase.com and sign up
2. Create a new project
3. In Settings > Database, note your:
   - **Host**: `db.XXXXX.supabase.co`
   - **Password**: Set your own strong password
   - **Project URL**: `https://XXXXX.supabase.co`
   - **Project Reference**: `XXXXX` (from URL)
   - **Anon/Public Key**: From API settings

**Option B: Local PostgreSQL**
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database: `createdb bfp_fire_map`
3. Default credentials: `postgres:password@localhost:5432/bfp_fire_map`

#### Google API Key

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Maps Static API
4. Create API Key (Credentials > Create Credentials > API Key)
5. Restrict to Maps/Geocoding API and required application URIs

#### (Optional) Firebase

Only needed if using Firestore as data provider:
1. Create Firebase project at https://console.firebase.google.com
2. Download service account key (Project Settings > Service Accounts > Generate New Private Key)
3. Store in secure location (NOT in git)

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd bfp-backend
```

### Step 2: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values (open in text editor)
```

### Step 3: Fill Environment Variables

Edit `.env` and replace placeholder values:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:YOUR_STRONG_PASSWORD@db.XXXXX.supabase.co:5432/postgres?sslmode=require
SUPABASE_PROJECT_REF=XXXXX
SUPABASE_URL=https://XXXXX.supabase.co

# Application Secrets (Generate Random Values)
JWT_SECRET=generate-a-random-32-char-string-here
GOOGLE_API_KEY=AIzaSy_YOUR_ACTUAL_KEY_HERE

# Server Configuration
NODE_ENV=development    # or 'production'
PORT=5000
DATA_PROVIDER=postgres  # or 'firestore'
```

**To generate JWT_SECRET:**
```bash
# On Windows PowerShell:
[convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Maximum 256)}))

# On Mac/Linux:
openssl rand -base64 32
```

### Step 4: Install Dependencies

```bash
npm install
```

This installs all Node.js dependencies listed in `package.json`.

### Step 5: Initialize Database (if new)

If using a fresh database, run migrations:

```bash
node migrations/run_railway_migration.js
# or
npm run migrate:latest
```

This creates all required tables:
- `users`
- `incidents`
- `forecasts`
- `barangays`
- `notifications`
- etc.

### Step 6: Verify Backend Setup

```bash
npm test
# or start the server:
npm start
# Server should start on http://localhost:5000
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd bfp-frontend
```

### Step 2: Create Environment File

```bash
# Copy the example file
cp .env.example .env
```

### Step 3: Fill Environment Variables

Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=AIzaSy_YOUR_ACTUAL_KEY_HERE
```

For production, update to your actual backend domain:
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Run Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173` (or next available port)

### Step 6: Build for Production

```bash
npm run build
```

This generates optimized static files in the `dist/` folder, ready for deployment to static hosting (Netlify, Vercel, S3, etc.).

---

## Forecast API Setup

### Step 1: Navigate to Forecast API Directory

```bash
cd bfpforecastAPI
```

### Step 2: Create Virtual Environment (Recommended)

**On Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Key dependencies:
- `fastapi==0.115.5` - Web framework
- `uvicorn[standard]==0.32.0` - ASGI server
- `statsmodels==0.14.2` - ARIMA/forecasting models
- `numpy`, `pandas`, `scipy` - Data science

### Step 4: Run the API

```bash
python main.py
```

or with Uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

API will be available at `http://localhost:8001`

### Step 5: Test Forecast API

```bash
# Get API documentation
curl http://localhost:8001/docs

# Or open in browser:
# http://localhost:8001/docs (Swagger UI)
# http://localhost:8001/redoc (ReDoc)
```

---

## Running Locally (All 3 Services)

### Terminal 1: Backend

```bash
cd bfp-backend
npm install
npm start
# Runs on http://localhost:5000
```

### Terminal 2: Frontend

```bash
cd bfp-frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Terminal 3: Forecast API

```bash
cd bfpforecastAPI
python -m venv venv
# Activate venv (see above)
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8001
```

### Access Application

Open browser to: `http://localhost:5173`

Default test credentials (if configured):
- Username: `admin@example.com`
- Password: `password` (or configured in backend)

---

## Production Deployment

### Overview

Production deployment involves building and deploying each service separately:

```
Frontend (dist/) → Static Hosting (CDN/S3)
         ↓
Backend (Docker) → Container Platform (Docker, Render, Railway)
         ↓
Forecast API (Docker) → Container Platform
```

### Backend Deployment

#### Option 1: Docker (Recommended)

**Build image:**
```bash
cd bfp-backend
docker build -t bfp-backend:latest .
```

**Run container:**
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="your-db-url" \
  -e JWT_SECRET="your-jwt-secret" \
  -e GOOGLE_API_KEY="your-google-key" \
  bfp-backend:latest
```

#### Option 2: Render.com

1. Push code to GitHub
2. Create new Web Service on Render.com
3. Connect GitHub repository
4. Set environment variables in Render dashboard
5. Deploy

#### Option 3: Railway

1. Sign up at https://railway.app
2. Create new project
3. Connect GitHub repository
4. Set environment variables
5. Deploy

### Frontend Deployment

#### Option 1: Netlify

```bash
cd bfp-frontend
npm run build
# Upload dist/ folder to Netlify
```

Or connect GitHub:
1. Push code to GitHub
2. Connect repository on Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Set environment variables for production

#### Option 2: Vercel

```bash
npm install -g vercel
cd bfp-frontend
vercel
```

#### Option 3: AWS S3 + CloudFront

```bash
cd bfp-frontend
npm run build

# Upload dist/ to S3 bucket
aws s3 sync dist/ s3://your-bucket-name/

# Create CloudFront distribution pointing to S3 bucket
```

### Forecast API Deployment

#### Option 1: Google Cloud Run

```bash
cd bfpforecastAPI

# Build image
docker build -t forecast-api .

# Tag for Google Container Registry
docker tag forecast-api:latest gcr.io/YOUR_PROJECT_ID/forecast-api:latest

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/forecast-api:latest

# Deploy to Cloud Run (via console or gcloud CLI)
```

#### Option 2: Docker Hub + Any Docker Host

```bash
# Login to Docker Hub
docker login

# Tag and push
docker tag forecast-api:latest USERNAME/forecast-api:latest
docker push USERNAME/forecast-api:latest

# Deploy on your host:
docker run -p 8001:8001 USERNAME/forecast-api:latest
```

---

## Production Checklist

Before going live, verify:

- [ ] **Database**: Production PostgreSQL/Supabase with backups enabled
- [ ] **Secrets**: All `.env` variables filled with real, secure values
- [ ] **JWT Secret**: Changed from default to random, secure value
- [ ] **API Keys**: Google Maps key restricted to specific domains
- [ ] **CORS**: Backend CORS configured to allow frontend domain only
- [ ] **HTTPS**: Frontend and Backend accessed via HTTPS
- [ ] **Rate Limiting**: Enabled on API endpoints
- [ ] **Monitoring**: Logging and error tracking configured (Sentry, DataDog, etc.)
- [ ] **Backups**: Database backups scheduled and verified
- [ ] **SSL Certificates**: Valid certificates for all domains
- [ ] **Environment**: Set `NODE_ENV=production` on backend
- [ ] **Build**: Frontend built with `npm run build` (not npm run dev)

---

## Troubleshooting

### Backend Won't Start

**Error**: `Cannot connect to database`
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Verify firewall allows connections to database host
- Test connection: `psql postgresql://user:pass@host:5432/db`

**Error**: `Cannot find module 'express'`
- Run `npm install` in `bfp-backend/`
- Delete `node_modules/` and `package-lock.json`, then reinstall

### Frontend Build Fails

**Error**: `VITE_API_BASE_URL undefined`
- Verify `.env` file exists in `bfp-frontend/`
- Restart dev server after creating `.env`
- Ensure variable names start with `VITE_` (Vite requirement)

### Forecast API Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`
- Verify Python virtual environment is activated
- Run `pip install -r requirements.txt`
- Verify Python 3.8+: `python --version`

### Services Can't Communicate

**Error**: Frontend can't reach backend
- Verify `VITE_API_BASE_URL` points to correct backend URL
- Check CORS headers: `curl -i http://localhost:5000/health`
- Backend CORS configuration in `middleware/`

**Error**: Backend can't reach Forecast API
- Verify `FORECAST_SERVICE_URL` in backend `.env`
- Forecast API must be running and accessible on that port
- Test: `curl http://localhost:8001/docs`

### Database Migrations Failed

- Check PostgreSQL connection
- Verify user has CREATE TABLE permissions
- Review migration logs in `migrations/`
- Manually run migrations if needed: `node migrations/run_railway_migration.js`

---

## Support & Documentation

For additional information:

- Backend: See `bfp-backend/DEPLOYMENT_GUIDE.md`
- Frontend: See `bfp-frontend/DEPLOYMENT_GUIDE.md`
- Forecast API: See `bfpforecastAPI/README.md`
- Google Maps: https://developers.google.com/maps/documentation
- Supabase: https://supabase.com/docs
- FastAPI: https://fastapi.tiangolo.com/

---

**Last Updated**: May 2026
