# BFP Fire Risk Map - Submission & Deployment Checklist

Use this checklist to verify the project is ready for school submission and production deployment.

---

## Pre-Submission Security Verification

### Sensitive Files Check

- [ ] **No real `.env` files present** - Only `.env.example` files should exist
  ```bash
  # Verify: Should find NO matches for real secrets
  grep -r "DATABASE_URL=postgresql" bfp-backend/
  grep -r "GOOGLE_API_KEY=AIzaSy" bfp-backend/
  ```

- [ ] **No `serviceAccountKey.json` present**
  ```bash
  find . -name "serviceAccountKey.json"  # Should return nothing
  ```

- [ ] **No real `.env.production` or `.env.local` files**
  ```bash
  find . -name ".env.*" | grep -v ".env.example"  # Should be empty
  ```

- [ ] **No Firebase credentials files**
  ```bash
  find . -name "*firebase*" | grep -v ".firebaserc" | grep -v "firebase.json"
  ```

### Credentials Audit

- [ ] All hardcoded API keys removed from source code
- [ ] No database passwords in configuration files (only placeholders)
- [ ] No JWT secrets visible in repository
- [ ] All secrets must be filled at deployment time via environment variables

---

## Project Structure Verification

### Root Level
- [ ] `README.md` - Project overview and architecture
- [ ] `DEPLOYMENT_SETUP.md` - Detailed deployment instructions
- [ ] `SUBMISSION_CHECKLIST.md` - This file
- [ ] `.gitignore` - Proper ignore patterns
- [ ] Three main directories: `bfp-backend/`, `bfp-frontend/`, `bfpforecastAPI/`

### Backend (bfp-backend/)

**Directories:**
- [ ] `config/` - Database and service configuration
- [ ] `routes/` - API endpoints
- [ ] `middleware/` - Authentication and request processing
- [ ] `services/` - Business logic
- [ ] `models/` - Database models
- [ ] `utils/` - Utility functions
- [ ] `db/` - Database initialization
- [ ] `migrations/` - Schema migrations
- [ ] `data/` - Reference data (barangays.json)
- [ ] `forecasting/` - Python ARIMA forecasting scripts
- [ ] `docs/` - Documentation

**Files:**
- [ ] `package.json` - Node.js dependencies
- [ ] `package-lock.json` - Dependency lock file (reproducible builds)
- [ ] `server.js` - Express application entry point
- [ ] `Dockerfile` - Container configuration
- [ ] `.dockerignore` - Docker build ignore patterns
- [ ] `.env.example` - Template for environment variables
- [ ] `DEPLOYMENT_GUIDE.md` - Backend-specific deployment docs

**Important - NOT Present:**
- [ ] `.env` - Real environment file (should NOT be in repo)
- [ ] `serviceAccountKey.json` - Firebase credentials
- [ ] `node_modules/` - Dependencies folder (gitignored)
- [ ] `dist/` or build outputs (gitignored)

### Frontend (bfp-frontend/)

**Directories:**
- [ ] `src/` - React components and application code
- [ ] `landing/` - Landing page
- [ ] `public/` - Static assets

**Files:**
- [ ] `vite.config.js` - Vite build configuration
- [ ] `eslint.config.js` - Code quality configuration
- [ ] `package.json` - Node.js dependencies
- [ ] `package-lock.json` - Dependency lock file
- [ ] `index.html` - HTML entry point
- [ ] `.env.example` - Template for environment variables
- [ ] `README.md` - Frontend documentation
- [ ] `DEPLOYMENT_GUIDE.md` - Frontend deployment guide

**Important - NOT Present:**
- [ ] `.env` - Real environment file
- [ ] `dist/` - Build artifacts (will be generated with `npm run build`)
- [ ] `node_modules/` - Dependencies (gitignored)

### Forecast API (bfpforecastAPI/)

**Files:**
- [ ] `main.py` - FastAPI application
- [ ] `requirements.txt` - Python dependencies
- [ ] `Dockerfile` - Container configuration
- [ ] `cloudbuild.yaml` - Google Cloud Build configuration
- [ ] `README.md` - API documentation
- [ ] `validate_integration.py` - Integration tests (optional)

**Important - NOT Present:**
- [ ] `.venv/` or `venv/` - Virtual environment (gitignored)
- [ ] `__pycache__/` - Python cache (gitignored)
- [ ] `.env` - Real environment file

---

## Build & Runtime Verification

### Backend Build Check

```bash
cd bfp-backend
npm install
npm start
# Verify: Server starts without errors on http://localhost:5000
```

- [ ] `npm install` completes successfully
- [ ] No security vulnerabilities: `npm audit`
- [ ] Server starts without errors
- [ ] Endpoints respond: `curl http://localhost:5000/health`

### Frontend Build Check

```bash
cd bfp-frontend
npm install
npm run build
# Verify: dist/ folder created with optimized assets
```

- [ ] `npm install` completes successfully
- [ ] `npm run build` creates `dist/` folder without errors
- [ ] No security vulnerabilities: `npm audit`
- [ ] Dev server works: `npm run dev`

### Forecast API Build Check

```bash
cd bfpforecastAPI
python -m venv venv
# Activate venv
pip install -r requirements.txt
python main.py
# Verify: API starts on http://localhost:8001
```

- [ ] Virtual environment created successfully
- [ ] All dependencies install without errors
- [ ] API starts and responds: `curl http://localhost:8001/docs`
- [ ] No security vulnerabilities: `pip audit` or `safety check`

---

## Documentation Verification

- [ ] `README.md` is comprehensive and accurate
- [ ] `DEPLOYMENT_SETUP.md` has clear step-by-step instructions
- [ ] `.env.example` files document all required variables
- [ ] `bfp-backend/DEPLOYMENT_GUIDE.md` exists and is current
- [ ] `bfp-frontend/DEPLOYMENT_GUIDE.md` exists and is current
- [ ] `bfpforecastAPI/README.md` documents API usage

---

## Database Verification

- [ ] Database schema migrations are version-controlled in `bfp-backend/migrations/`
- [ ] All migration files are present and ready to run
- [ ] `DATABASE_URL` format is documented
- [ ] Schema supports required entities:
  - [ ] Users (authentication, roles)
  - [ ] Incidents (fire reports, status tracking)
  - [ ] Forecasts (predictions by barangay)
  - [ ] Notifications (alert system)
  - [ ] Barangays (geographic data)

---

## Environment Variable Verification

### Backend `.env.example` Contains:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SUPABASE_PROJECT_REF` - Supabase project identifier
- [ ] `SUPABASE_URL` - Supabase API URL
- [ ] `JWT_SECRET` - Marked as needing a real value for production
- [ ] `GOOGLE_API_KEY` - For Maps and Geocoding
- [ ] `FORECAST_SERVICE_URL` - Backend to Forecast API communication
- [ ] `PORT` - Server port (default 5000)
- [ ] `NODE_ENV` - Environment (development/production)
- [ ] `DATA_PROVIDER` - Data source (postgres/firestore)

### Frontend `.env.example` Contains:

- [ ] `VITE_API_BASE_URL` - Backend API URL
- [ ] `VITE_GOOGLE_MAPS_API_KEY` - For map functionality (if used)

### Forecast API Uses:

- [ ] Environment variables or configuration for port (default 8001)
- [ ] Database connection if needed

---

## Production Deployment Readiness

### Security Pre-Deployment Checklist

- [ ] **JWT Secret**: Generate new random value before production deployment
  ```bash
  # Example generation:
  openssl rand -base64 32
  ```

- [ ] **API Keys**: Create new API keys with restricted scopes
  - [ ] Google Maps API key with domain restrictions
  - [ ] If using Firebase, create new service account

- [ ] **Database Credentials**: Change default passwords
  - [ ] Create strong database password (20+ characters)
  - [ ] Use separate credentials for production database

- [ ] **CORS Configuration**: Updated in backend middleware
  - [ ] Allow only frontend domain in production
  - [ ] Restrict API access appropriately

- [ ] **HTTPS**: All production URLs use HTTPS
  - [ ] Frontend served over HTTPS
  - [ ] Backend API served over HTTPS
  - [ ] SSL certificates valid and not self-signed

- [ ] **Environment Isolation**: Production secrets never in code
  - [ ] Use platform secret management (GitHub Secrets, Render Env Vars, etc.)
  - [ ] Never commit `.env` files
  - [ ] Use CI/CD to inject secrets at build time

---

## File Count & Size Verification

```bash
# Count files (should be < 500 files, excluding node_modules)
find . -type f ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l

# Check total size (should be < 100MB uncompressed)
du -sh .

# Verify no large artifacts
find . -type f -size +10M ! -path "*/node_modules/*"
```

- [ ] Total folder size: **< 100MB** (without node_modules)
- [ ] No files > 10MB (except necessary binaries)
- [ ] Source code properly organized

---

## Final Submission Verification

### Submission Package Contents

When ready to submit, verify the folder contains:

```
BFPFireRiskMap-clean/
├── README.md                    ✓ (Project overview)
├── DEPLOYMENT_SETUP.md          ✓ (Setup instructions)
├── SUBMISSION_CHECKLIST.md      ✓ (This file)
├── .gitignore                   ✓ (Git ignore patterns)
├── bfp-backend/
│   ├── src files and configs    ✓
│   ├── .env.example             ✓
│   ├── package.json             ✓
│   ├── package-lock.json        ✓
│   └── migrations/              ✓
├── bfp-frontend/
│   ├── src/                     ✓
│   ├── .env.example             ✓
│   ├── package.json             ✓
│   ├── package-lock.json        ✓
│   └── vite.config.js           ✓
└── bfpforecastAPI/
    ├── main.py                  ✓
    ├── requirements.txt         ✓
    ├── Dockerfile               ✓
    └── README.md                ✓
```

### Final Checks Before Submission

- [ ] All three subsystems have complete source code
- [ ] `.env.example` files are present (real `.env` excluded)
- [ ] All package lock files present (`package-lock.json`, `requirements.txt`)
- [ ] Documentation is complete and accurate
- [ ] No sensitive files remain (use grep verification above)
- [ ] Folder size is reasonable (< 100MB)
- [ ] README provides clear overview
- [ ] DEPLOYMENT_SETUP.md has complete instructions

### Ready for ZIP

Once all checks pass:

```bash
# Create ZIP file for submission
7z a -r BFPFireRiskMap-clean.zip BFPFireRiskMap-clean/
# or
Compress-Archive -Path "BFPFireRiskMap-clean" -DestinationPath "BFPFireRiskMap-clean.zip"
```

- [ ] ZIP file created successfully
- [ ] ZIP file size is reasonable (< 50MB)
- [ ] ZIP can be extracted without errors

---

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing package-lock.json | npm install gives different results | Ensure `package-lock.json` is committed to folder |
| Real .env present | Build fails with database errors | Remove `.env`, use `.env.example` as template |
| Build artifacts included | Folder too large (> 500MB) | Remove `dist/`, `node_modules/`, `__pycache__/` |
| serviceAccountKey.json present | Security concern before submission | Remove and use `.env.example` instructions |
| Migrations not present | Database schema not reproducible | Verify `bfp-backend/migrations/` has all SQL files |
| .gitignore missing | Sensitive files might be included | Create `.gitignore` with patterns for `.env`, `node_modules/`, etc. |

---

**Checklist Version**: 1.0  
**Last Updated**: May 2026

✅ **When all items are checked, the project is ready for submission and production deployment!**
