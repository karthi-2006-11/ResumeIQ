const express = require('express');
const router = express.Router();
const { handlePdfUpload } = require('../middleware/upload.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');
const { checkAnalysisQuota } = require('../middleware/quota.middleware');
const { analyzeResumeHandler } = require('../controllers/analyze.controller');

// POST /api/v1/analyze (Supports both authenticated & anonymous uploads)
router.post('/analyze', optionalAuth, checkAnalysisQuota, handlePdfUpload, analyzeResumeHandler);

module.exports = router;
