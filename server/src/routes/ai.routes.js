const express = require('express');
const router = express.Router();
const { analyzeAiInsightsHandler } = require('../controllers/ai.controller');

// POST /api/v1/ai/analyze
router.post('/ai/analyze', analyzeAiInsightsHandler);

module.exports = router;
