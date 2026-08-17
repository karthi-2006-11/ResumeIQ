# ResumeIQ — API Reference Documentation (v2.0)

ResumeIQ provides a RESTful backend API for JWT User Authentication, Version 2.0 PDF resume analysis, target job description matching, user-owned MongoDB history persistence, and qualitative AI career feedback.

---

## 🔒 Base Configuration & Headers

* **Base URL**: `http://localhost:5000`
* **API Version**: `v1` (`/api/v1`)
* **Engine Version**: `2.0`
* **Authorization Header**: Protected endpoints require `Authorization: Bearer <token>`.
* **Request ID Header**: Every response includes `X-Request-ID: <uuid>` for tracing and operational auditing.

---

## 🧠 1. Version 2.0 Resume Analysis API

### `POST /api/v1/analyze`
Performs in-memory PDF text extraction, normalized section boundary parsing, alias skill matching, and bullet quality analysis.

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
      "linkedin": "https://linkedin.com/in/candidate",
      "hasGithub": true,
      "github": "https://github.com/candidate",
      "name": "Jane Candidate"
    },
    "sectionsFound": ["summary", "skills", "experience", "education"],
    "skillsFound": ["JavaScript", "TypeScript", "Node.js", "PostgreSQL", "React", "AWS", "Git", "REST APIs"],
    "skillCategories": {
      "Programming Languages": ["JavaScript", "TypeScript"],
      "Backend": ["Node.js", "REST APIs"],
      "Databases": ["PostgreSQL"],
      "Frontend": ["React"],
      "Cloud & DevOps": ["AWS", "Git"]
    },
    "skillsMissing": ["Docker", "CI/CD"],
    "experienceStats": {
      "bulletCount": 6,
      "quantificationCount": 3,
      "actionVerbsCount": 5,
      "passivePhrasesCount": 0,
      "duplicateBulletsCount": 0,
      "strongBullets": 3,
      "mediumBullets": 3,
      "weakBullets": 0
    },
    "suggestions": [
      {
        "priority": "medium",
        "title": "Add Docker & CI/CD Skill Keywords",
        "desc": "Incorporate missing DevOps skills to strengthen alignment for Senior Software Engineer roles."
      }
    ],
    "summary": "Your resume has been processed with ResumeIQ Engine v2.0. Excellent ATS compatibility with strong skill coverage.",
    "metadata": {
      "wordCount": 420,
      "characterCount": 2850,
      "pageCount": 1,
      "sectionCount": 4,
      "bulletCount": 6,
      "skillCount": 8
    }
  }
}
```

---

## 🎯 2. Alias-Aware Job Match API

### `POST /api/v1/job-match`
Compares an uploaded PDF resume against a target Job Description using alias-aware matching (`JD: Node.js` matches `Resume: NodeJS`).

* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  * `file`: PDF Resume Document (Required, Max 5MB)
  * `targetRole`: Target Role string
  * `jobDescription`: Target Job Description text (Required, Min 20 chars, Max 50,000 chars)
* **Response (`200 OK`)**:
```json
{
  "success": true,
  "jobMatch": {
    "matchScore": 88,
    "scores": {
      "requiredSkills": 90,
      "preferredSkills": 85,
      "keywords": 80,
      "roleRelevance": 86,
      "experience": 90
    },
    "requiredSkills": ["JavaScript", "Node.js", "PostgreSQL", "Git"],
    "matchingSkills": ["JavaScript", "Node.js", "PostgreSQL", "Git"],
    "missingSkills": ["Docker"],
    "recommendations": [
      {
        "title": "Strong Job Alignment",
        "desc": "Your resume covers primary requirements of this job description."
      }
    ]
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

## 🛡️ 4. Privacy & Data Protection Guarantees

1. **No Raw Text Storage**: Neither raw resume text nor raw job description text is ever stored in MongoDB.
2. **No PDF Buffer Storage**: PDF binary buffers are held in temporary RAM (`multer.memoryStorage()`) during parsing and discarded immediately afterwards.
3. **Deterministic Scoring Authority**: All numerical scores are calculated deterministically by Engine v2.0. AI does NOT calculate or override numerical scores.
