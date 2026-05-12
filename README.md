# BFP Fire Risk Map - Deployment-Ready Source Code

This folder contains the complete, sanitized source code for the **BFP Fire Risk Map** system, suitable for school submission and production deployment.

## What's Included

- **bfp-backend/**: Express.js REST API (Node.js)
- **bfp-frontend/**: React web application (Vite)
- **bfpforecastAPI/**: FastAPI Python microservice for time-series forecasting

## What's Excluded (For Security)

- `.env` files with real credentials
- `serviceAccountKey.json` (Firebase credentials)
- Build artifacts (`dist/`, `node_modules/`, `__pycache__/`)
- Cache files and development artifacts
- Archive folders and legacy code
- Development-only utilities

## Quick Start

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for detailed deployment instructions.

## Project Overview

### Architecture

The BFP Fire Risk Map is a full-stack application for real-time fire incident tracking, forecasting, and response coordination:

1. **Frontend (bfp-frontend/)**: React + Vite
   - Real-time map visualization with Google Maps API
   - Incident command dashboard
   - Reporting and analytics views
   - Responsive design for desktop and mobile

2. **Backend (bfp-backend/)**: Express.js + PostgreSQL
   - REST API for all frontend operations
   - Authentication and authorization
   - Real-time incident management
   - Integration with forecasting service
   - Support for PostgreSQL (Supabase) and Firebase Firestore

3. **Forecast API (bfpforecastAPI/)**: FastAPI + Python
   - Time-series forecasting using ARIMA, moving average, and naive methods
   - Barangay-level fire incident predictions
   - RESTful interface for the backend to consume

### Database

- **Primary**: PostgreSQL (hosted on Supabase)
- **Fallback**: Firebase Firestore (optional)

### Key Features

- Multi-user incident management
- Predictive fire risk forecasting
- Real-time notifications
- Historical incident tracking
- Admin dashboard with analytics
- Role-based access control (Responder, Admin, Station Officer)

## Getting Started

### Prerequisites

- Node.js 18+ (for backend and frontend)
- Python 3.8+ (for forecast API)
- PostgreSQL 13+ (or Supabase account for managed PostgreSQL)
- Google Maps API key (for geocoding and map visualization)
- (Optional) Firebase project if using Firestore backend

### Setup Instructions

Detailed setup instructions for each subsystem are in [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md).

### Environment Configuration

Each subsystem has an `.env.example` file showing all required environment variables:

- `bfp-backend/.env.example`
- `bfp-frontend/.env.example`

Copy these to `.env` and fill in with your actual values.

## Verification Checklist

Before submitting or deploying, verify all requirements in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

## Deployment

This source code is ready for deployment to:

- **Backend**: Docker, Heroku, Railway, Render, Google Cloud Run
- **Frontend**: Netlify, Vercel, S3 + CloudFront, or any static hosting
- **Forecast API**: Google Cloud Run, AWS Lambda (with modifications), or Docker

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for platform-specific guides.

## Security Notice

⚠️ **Important**: Before deploying to production:

1. **Generate new secrets**:
   - `JWT_SECRET`: Use a random 32+ character string
   - `GOOGLE_API_KEY`: Create a new API key with restricted scopes
   - `DATABASE_URL`: Change the database password

2. **Environment Variables**: Never commit `.env` files. Use your deployment platform's secret management:
   - GitHub Secrets for GitHub Actions
   - Render/Railway environment variable dashboard
   - AWS Secrets Manager / Google Cloud Secret Manager
   - Heroku Config Vars

3. **Firebase** (if using Firestore): Never commit `serviceAccountKey.json`. Store in secure vault or use service account impersonation.

4. **API Rate Limiting**: Configure rate limiting on the backend API (currently using basic auth middleware).

5. **CORS**: Update CORS configuration in `bfp-backend/middleware/` to match your frontend domain.

## Support

For detailed deployment procedures, build instructions, or troubleshooting, refer to:

- [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) - Step-by-step deployment guide
- `bfp-backend/DEPLOYMENT_GUIDE.md` - Backend-specific documentation
- `bfp-frontend/DEPLOYMENT_GUIDE.md` - Frontend-specific documentation
- `bfpforecastAPI/README.md` - Forecast API documentation

## License

[Your License Here]

## Author

[Your Name/Organization Here]
