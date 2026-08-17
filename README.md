# ResumeIQ — AI-Powered Resume Analyzer

ResumeIQ is a modern, lightweight, privacy-focused web application designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS) and hiring managers.

Built with **pure HTML5, CSS3, and Vanilla JavaScript** on the frontend and a **modular Node.js + Express + MongoDB backend**, ResumeIQ provides **Version 2.0 Advanced Resume Intelligence**, **Phase 18 Resume Improvement Assistant**, **Verified Strengths Detection**, **Actionable Priority Plans**, **Safe Non-Fabricating Rewrite Suggestions**, **JWT Authentication & User Account Ownership**, **Authenticated Dashboard & History**, and **Offline Browser Fallback**.

---

## 🌟 Currently Available Features

### 🛠️ Resume Optimization Workspace (Phase 19)
* **Read-Only Original Resume Separation**: The original uploaded resume text and analysis remain immutable. The user works on a dedicated **Optimized Resume Draft** stored in client-side session state (`resumeIQ_draft_workspace`).
* **Suggestion Review Workflows**: Supports `pending`, `accepted`, `edited`, and `dismissed` states for each improvement recommendation.
* **Structured Resume Editor**: Lightweight interactive text editors for Summary, Technical Skills (tag list), Experience Bullets, Projects, Education, and Contact Information.
* **Undo & Reset Controls**: Provides single-click **Undo Last Change** (restores snapshot from undo stack) and **Reset Draft** (reverts draft back to original initial state).
* **Deterministic Re-Analysis & Score Comparison**: Clicking **[⚡ Re-analyze Optimized Draft]** compiles draft text and re-runs `ResumeIQAnalyzer` deterministically. Honest before/after score comparison table displays exact `+Diff` / `-Diff` score changes (ATS Score, Skills Match, Quality Score, Job Match Score) with **zero artificial inflation**.
* **Client-Side Print / PDF Export**: Generates a clean printable optimized resume layout via browser print CSS excluding UI score gauges, buttons, and internal metadata.

### 💡 Resume Improvement Assistant (Phase 18)
* **Verified Strengths Detection**: Highlights candidate resume strengths backed by actual Resume Intelligence v2 signals (complete contact info, strong technical skill coverage, clean section structure, quantified metrics).
* **Prioritized Action Plan**: Generates a clear, ordered list of recommendations ranked by priority (`high`, `medium`, `low`).
* **Safe Non-Fabricating Rewrite Suggestions**: Offers rewrites for passive language (`responsible for` → `Managed`, `worked on` → `Contributed to`) without changing facts or scope.
* **Strict Non-Fabrication Rule**: The system **NEVER** invents metrics (`40%`), team sizes (`led 5 engineers`), revenue, company names, job titles, technologies, or certifications not present in source context.
* **User Control (Copy & Dismiss)**: Every rewrite suggestion includes **[Copy Suggestion]** with accessible toast feedback and **[Dismiss]** button for in-session removal. User remains in 100% control of all content changes.
* **Deterministic Score Preservation**: Improvement guidance and rewrite suggestions **DO NOT alter ATS or Job Match scores**.

### 🧠 Version 2.0 Advanced Resume Intelligence
* **Normalized Section & Boundary Parsing**: Automatically identifies section boundaries and maps heading variations (`Professional Summary` → `summary`, `Technical Expertise` → `skills`, `Employment History` → `experience`, `Academic Background` → `education`).
* **Contact Info Extractor**: Parses Email, Phone (Indian & International), LinkedIn URL, GitHub URL, and Candidate Name with strict false-positive prevention.
* **Skill Alias Normalization & False-Positive Protection**: Maps aliases (`JS` → `JavaScript`, `NodeJS` → `Node.js`, `Postgres` → `PostgreSQL`, `ReactJS` → `React`) while enforcing word boundaries so single-letter skills like `C` do not match `CSS` or `Cloud`.
* **Bullet Quality & Quantification Analysis**: Analyzes action verbs (`Built`, `Architected`, `Engineered`), quantification metrics (`40%`, `$100K`, `500+`), passive language (`responsible for`), and duplicate bullet warnings.

### 🔐 Authenticated Experience
* **Login & Registration (`login.html`, `register.html`)**: Responsive SaaS login and registration with password policy enforcement (min. 8 chars) and redirect parameters.
* **User Dashboard (`dashboard.html`)**: Central authenticated portal displaying total analyses count, average ATS score, total job matches, average match score, quick CTAs, and recent activity.
* **Personal Analysis History (`history.html`)**: Tabbed, searchable, paginated listing of saved resume analyses and job match reports with direct view and confirmed deletion (`DELETE /api/v1/analyses/:id`).

### ⚡ Anonymous Local Experience (Preserved)
* **Anonymous Local Resume Analysis & Job Matching**: Unauthenticated users can perform local browser resume analysis, local job description matching, or demo mode **WITHOUT creating an account or logging in**.

---

## 🏗️ Architecture & Service Layer

```
                         ResumeIQ Web App
                                │
                                ▼
                       Engine Version 2.0
                                │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
      Anonymous User                         Authenticated User
   (Local Browser Analysis)              (JWT Bearer Token Access)
             │                                     │
             ▼                                     ▼
    Improvement Assistant               Improvement Assistant & History
   (No Account Required)                   (Isolated Data Records)
```

### 🚀 Production Deployment Architecture
* **Frontend**: GitHub Pages static hosting (`https://karthi-2006-11.github.io/ResumeIQ/`)
* **Backend**: Separate Node.js / Express host (Render, Railway, AWS, DigitalOcean)
* **Database**: MongoDB Atlas / compatible MongoDB instance
* **AI Provider**: Optional server-side LLM provider (Gemini / OpenAI)

---

## 💻 Running the Application

```bash
# Navigate to server directory
cd server

# Install Node dependencies
npm install

# Run backend unit & integration test suite (59 tests)
npm test

# Start server in development mode
npm run dev
```

---

## 🔒 Security, Privacy & Password Safety Rules

1. **Deterministic Score Authority**: Numerical scores are calculated 100% deterministically by the ResumeIQ Engine v2.0. AI is purely qualitative and advisory.
2. **Non-Fabrication Guarantee**: Wording suggestions use ONLY facts present in user context. No fake numbers or qualifications are created.
3. **Privacy Architecture**: Resumes and JDs are processed strictly in RAM (`multer.memoryStorage()`) during analysis and discarded immediately afterwards. **Raw PDF files, raw resume text, and raw job descriptions are NEVER stored in MongoDB.**
4. **Zero Secrets in Code**: `JWT_SECRET`, `AI_API_KEY`, and `MONGODB_URI` exist **ONLY** in server-side `.env` files.
5. **Anonymous Mode Preserved**: Offline browser analysis continues working 100% without requiring login.

---

## 📝 Disclaimer

ResumeIQ provides suggestions and guidance for user review. It does not automatically modify a resume or guarantee specific ATS or hiring outcomes. AI suggestions require user verification. OCR is not supported; text-selectable PDFs are required.
