# ResumeIQ — API Reference Documentation (v2.0 / Phase 18)

ResumeIQ provides a RESTful backend API for JWT User Authentication, Version 2.0 PDF resume analysis, Phase 18 Resume Improvement Assistant, target job description matching, user-owned MongoDB history persistence, and qualitative AI career feedback.

---

## 🔒 Base Configuration & Headers

* **Base URL**: `http://localhost:5000`
* **API Version**: `v1` (`/api/v1`)
* **Engine Version**: `2.0` (Resume Intelligence), `18.0` (Improvement Assistant)
* **Authorization Header**: Protected endpoints require `Authorization: Bearer <token>`.
* **Request ID Header**: Every response includes `X-Request-ID: <uuid>` for tracing and operational auditing.

---

## 🧠 1. Version 2.0 Resume Analysis & Improvement API

### `POST /api/v1/analyze`
Performs in-memory PDF text extraction, section boundary parsing, skill matching, bullet quality analysis, and generates Phase 18 deterministic improvement guidance.

* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `file`: PDF Resume Document (Required, Max 5MB)
  * `targetRole`: Target Role string (Optional, Default: `"Software Engineer"`)
* **Response (`200 OK`)**:
```json
{
  "success": true,
  "analysis": {
    "version": "2.0",
    "mode": "backend",
    "fileName": "Resume.pdf",
    "fileSize": "240.0 KB",
    "targetRole": "Software Engineer",
    "hasExtractedText": true,
    "scannedPdfLikely": false,
    "scores": {
      "atsScore": 86,
      "skillsMatchPct": 88,
      "qualityScore": 85,
      "formattingScore": 90
    },
    "contactInfo": {
      "hasEmail": true,
      "email": "candidate@example.com",
      "hasPhone": true,
      "phone": "+91 98765 43210",
      "hasLinkedin": true,
      "github": "https://github.com/candidate",
      "name": "Jane Candidate"
    },
    "sectionsFound": ["summary", "skills", "experience", "education"],
    "skillsFound": ["JavaScript", "TypeScript", "Node.js", "PostgreSQL", "React", "AWS"],
    "improvements": {
      "version": "1.0",
      "engineVersion": "18.0",
      "overallPriority": "medium",
      "summary": "ResumeIQ Improvement Engine v18.0: Identified 3 key strengths and 2 action items.",
      "strengths": [
        {
          "id": "strength-contact-complete",
          "title": "Complete Contact Information",
          "description": "Your header contains all essential contact channels.",
          "evidence": "candidate@example.com | +91 98765 43210"
        }
      ],
      "issues": [
        {
          "id": "issue-passive-bullets",
          "category": "Bullet Quality",
          "priority": "medium",
          "title": "Replace Passive Language with Active Verbs",
          "evidence": "Detected passive phrasing (e.g., 'responsible for').",
          "recommendation": "Replace passive phrases with active verbs like 'Engineered' or 'Optimized'.",
          "affectedSection": "experience"
        }
      ],
      "actionPlan": [
        "1. Replace Passive Language with Active Verbs — Replace passive phrases with active verbs like 'Engineered'."
      ],
      "rewriteSuggestions": [
        {
          "id": "rewrite-bullet-0",
          "section": "experience",
          "original": "Responsible for managing Node.js services.",
          "suggestion": "Managed Node.js services.",
          "reason": "Replaces passive phrasing with active verb without changing scope.",
          "confidence": "high"
        }
      ]
    },
    "suggestions": [],
    "summary": "Your resume has been processed with ResumeIQ Engine v2.0."
  }
}
```

---

## 🤖 2. Opt-In AI Rewrite & Insights API

### `POST /api/v1/ai/analyze`
Generates qualitative AI career feedback or wording suggestions upon explicit user opt-in.

* **Content-Type**: `application/json`
* **Supported Tasks**: `'resume-feedback'`, `'job-match-explanation'`, `'improvement-plan'`, `'resume-rewrite'`, `'bullet-improvement'`
* **Request Body**:
```json
{
  "task": "resume-rewrite",
  "context": {
    "targetRole": "Software Engineer",
    "skillsFound": ["JavaScript", "Node.js"],
    "skillsMissing": ["Docker"],
    "summary": "Experienced software developer"
  }
}
```

---

## 🔑 3. Authentication & History APIs

* **`POST /api/v1/auth/register`**: Register Account (`201 Created`)
* **`POST /api/v1/auth/login`**: Authenticate Account (`200 OK`)
* **`GET /api/v1/auth/me`**: Current User Profile (`Authorization: Bearer <token>`)
* **`GET /api/v1/analyses`**: Paginated User Analysis History (`Authorization: Bearer <token>`)
* **`GET /api/v1/job-matches`**: Paginated User Job Match History (`Authorization: Bearer <token>`)
* **`DELETE /api/v1/analyses/:id`**: Delete User Analysis (`Authorization: Bearer <token>`)
* **`DELETE /api/v1/job-matches/:id`**: Delete User Job Match (`Authorization: Bearer <token>`)

---

## 🛡️ 4. Privacy & Non-Fabrication Guarantees

1. **No Raw Text Storage**: Neither raw resume text nor raw job description text is ever stored in MongoDB.
2. **No PDF Buffer Storage**: PDF binary buffers are held in temporary RAM (`multer.memoryStorage()`) during parsing and discarded immediately afterwards.
3. **Strict Non-Fabrication**: Wording suggestions use ONLY facts present in source user context. Fake numbers, company names, or skills are NEVER generated.
4. **Score Protection**: All numerical scores are calculated deterministically by Engine v2.0. AI does NOT calculate or override numerical scores.
