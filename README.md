# ResumeIQ — AI-Powered Resume Analyzer

ResumeIQ is a modern, lightweight, privacy-focused web application designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS) and hiring managers.

Built with **pure HTML5, CSS3, and Vanilla JavaScript** on the frontend and a **modular Node.js + Express + MongoDB backend**, ResumeIQ provides **Version 2.0 Advanced Resume Intelligence**, **Deterministic Section & Contact Parsing**, **Skill Alias Normalization**, **Bullet Quality & Quantification Detection**, **JWT Authentication & User Account Ownership**, **Authenticated Dashboard & History**, and **Offline Browser Fallback**.

---

## 🌟 Currently Available Features

### 🧠 Version 2.0 Advanced Resume Intelligence
* **Normalized Section & Boundary Parsing**: Automatically identifies section boundaries and maps heading variations (`Professional Summary` -> `summary`, `Technical Expertise` -> `skills`, `Employment History` -> `experience`, `Academic Background` -> `education`).
* **Contact Info Extractor**: Parses Email, Phone (Indian & International), LinkedIn URL, GitHub URL, and Candidate Name with strict false-positive prevention.
* **Skill Alias Normalization & False-Positive Protection**: Maps aliases (`JS` -> `JavaScript`, `NodeJS` -> `Node.js`, `Postgres` -> `PostgreSQL`, `ReactJS` -> `React`) while enforcing word boundaries so single-letter skills like `C` do not match `CSS` or `Cloud`.
* **Bullet Quality & Quantification Analysis**: Analyzes action verbs (`Built`, `Architected`, `Engineered`), quantification metrics (`40%`, `$100K`, `500+`), passive language (`responsible for`), and duplicate bullet warnings.
* **Scanned PDF Warning**: Identifies low-text image PDFs (`<50` characters) and alerts the user to upload a text-selectable PDF.
* **Version 2.0 Deterministic Scoring**: 100% formula-driven scoring model for ATS Score, Skills Match %, Quality Score, and Formatting Score. **AI does NOT calculate or override numerical scores.**
* **Alias-Aware Job Description Matching**: Job matching engine checks skill aliases so `JD: Node.js` correctly matches `Resume: NodeJS`.

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
      Standard Dashboard               Authenticated Dashboard & History
   (No Account Required)                   (Isolated Data Records)
```

---

## 💻 Running the Application

```bash
# Navigate to server directory
cd server

# Install Node dependencies
npm install

# Run backend unit & integration test suite (52 tests)
npm test

# Start server in development mode
npm run dev
```

---

## 🔒 Security, Privacy & Password Safety Rules

1. **Deterministic Score Authority**: Numerical scores are calculated 100% deterministically by the ResumeIQ Engine v2.0. AI is purely qualitative and advisory.
2. **Privacy Architecture**: Resumes and JDs are processed strictly in RAM (`multer.memoryStorage()`) during analysis and discarded immediately afterwards. **Raw PDF files, raw resume text, and raw job descriptions are NEVER stored in MongoDB.**
3. **Zero Secrets in Code**: `JWT_SECRET`, `AI_API_KEY`, and `MONGODB_URI` exist **ONLY** in server-side `.env` files.
4. **Anonymous Mode Preserved**: Offline browser analysis continues working 100% without requiring login.

---

## 📝 Disclaimer

ResumeIQ provides heuristic resume analysis, job matching, and qualitative AI feedback for guidance. It does not guarantee specific ATS or hiring outcomes. OCR is not supported; text-selectable PDFs are required.
