# ResumeIQ — Production Deployment Guide & Architecture Specification (v20.0)

This document provides complete instructions for deploying ResumeIQ to production environments (PaaS, VPS, Docker, or Kubernetes) safely and securely.

---

## 🏗️ 1. Architecture Overview

ResumeIQ follows a lightweight, decoupled production architecture:

```text
Browser Client
      │
      ├── Static Frontend Hosting (Netlify, Vercel, NGINX, S3/CloudFront, Cloudflare Pages)
      │      └── HTML5 / CSS3 / Vanilla JS (No build step required)
      │
      └── ResumeIQ Node.js + Express API (Render, Railway, AWS ECS, DigitalOcean, Heroku)
             ├── In-Memory Processing (PDF.js / Multer RAM memoryStorage — 0 raw text persistence)
             ├── MongoDB Atlas (User Accounts, Analysis Metadata, Job Match Metadata)
             └── Optional Server AI Provider (Gemini / OpenAI API — opt-in qualitative insights)
```

---

## 🔑 2. Production Environment Configuration

Create a `.env` file on your production server or configure environment variables in your cloud dashboard.

### Environment Variable Reference

| Variable | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production error sanitization, strict CORS, and security rules. |
| `PORT` | Optional | `5000` | Port for Express HTTP API server. |
| `CLIENT_ORIGIN` | **Yes** | `https://resumeiq.example.com` | Allowed CORS origin for browser requests. Must NOT be `*` in production. |
| `MONGODB_URI` | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/resumeiq` | Production MongoDB connection string. |
| `JWT_SECRET` | **Yes** | `32+ char random string` | Secret key for signing user authentication tokens. Must be secure. |
| `JWT_EXPIRES_IN` | Optional | `7d` | Expiration window for JWT tokens. |
| `AI_ENABLED` | Optional | `false` | Set `true` to enable AI qualitative enhancements. Default is `false`. |
| `AI_PROVIDER` | Optional | `mock` / `gemini` / `openai` | AI provider implementation selector. |
| `AI_MODEL` | Optional | `gemini-1.5-flash` | Selected LLM model identifier. |
| `AI_API_KEY` | Optional | `AIzaSy...` | Provider API Key (Required if `AI_ENABLED=true` and provider != `mock`). |

---

## 🌐 3. Frontend Deployment & GitHub Pages Hosting

The static frontend files (`index.html`, `upload.html`, `analysis.html`, `dashboard.html`, `history.html`, `login.html`, `register.html`) require **zero build bundlers**.

### GitHub Pages Automated Workflow
The repository includes `.github/workflows/deploy-pages.yml` which deploys the static frontend to GitHub Pages whenever code is pushed to the `main` branch or triggered via `workflow_dispatch`.

* **Target Production URL**: `https://karthi-2006-11.github.io/ResumeIQ/`
* **Artifact Scope**: Static HTML, CSS, JavaScript, and images ONLY (`_site` staging directory).
* **Excluded Artifacts**: Backend code (`server/`), node dependencies (`node_modules/`), Docker files, `.env` files, and test files are **100% excluded** from the GitHub Pages static bundle.

> **Note on Decoupled Backend Architecture:**
> GitHub Pages is a static file host and **cannot execute the Node.js / Express backend server**.
> Until your separate Express API server is deployed (e.g. on Render, Railway, or AWS) and `window.RESUMEIQ_API_URL` is configured, client-side browser analysis and demo mode operate locally in offline fallback mode.

### Setting the Production API URL

By default, the frontend resolves API calls to `http://localhost:5000`. To point static frontend pages to your production backend API, define `window.RESUMEIQ_API_URL` in a script tag or before loading `js/api-service.js`:

```html
<script>
  window.RESUMEIQ_API_URL = "https://api.resumeiq.example.com";
</script>
<script src="js/api-service.js"></script>
```

---

## 🐳 4. Docker Deployment

ResumeIQ provides a production-ready, unprivileged Dockerfile.

### Building & Running Docker Image

```bash
# Build production container image
docker build -t resumeiq-api:latest .

# Run container with environment variables
docker run -d \
  --name resumeiq-server \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e CLIENT_ORIGIN=https://resumeiq.example.com \
  -e MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/resumeiq \
  -e JWT_SECRET=super-secret-random-jwt-key-32-chars \
  resumeiq-api:latest
```

---

## 🔍 5. Operational Probes & Health Monitoring

ResumeIQ exposes two operational endpoints for load balancers and deployment monitoring:

1. **Liveness Probe (`GET /api/health`)**:
   - Returns HTTP `200 OK` when process is alive.
   - Response: `{"status":"UP","timestamp":"...","uptime":123.4}`

2. **Readiness Probe (`GET /api/ready`)**:
   - Returns HTTP `200 OK` when MongoDB database connection is active (`readyState === 1`).
   - Returns HTTP `503 Service Unavailable` if database is disconnected.

---

## 📋 6. Production Deployment Checklist

### Pre-Deployment
- [ ] Set `NODE_ENV=production`.
- [ ] Configure strong, random `JWT_SECRET` (min. 32 chars).
- [ ] Configure `CLIENT_ORIGIN` matching production domain.
- [ ] Configure `MONGODB_URI` pointing to MongoDB Atlas or secure DB.
- [ ] Verify `window.RESUMEIQ_API_URL` set on static frontend pages.
- [ ] Execute test suite (`npm test` in `server/`).
- [ ] Execute dependency audit (`npm audit`).

### Post-Deployment Smoke Test
- [ ] Verify `GET /api/health` returns `200 OK`.
- [ ] Verify `GET /api/ready` returns `200 OK`.
- [ ] Perform User Registration & Login.
- [ ] Perform Resume PDF Upload & Analysis.
- [ ] Perform Job Description Matching.
- [ ] Test Resume Optimization Workspace & Draft Re-analysis.
- [ ] Confirm CORS blocks unauthorized origins.
