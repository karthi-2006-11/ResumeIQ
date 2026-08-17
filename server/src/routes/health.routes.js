const express = require('express');
const router = express.Router();
const { getHealthHandler, getReadinessHandler } = require('../controllers/health.controller');

// GET /api/health
router.get('/health', getHealthHandler);

// GET /api/ready
router.get('/ready', getReadinessHandler);

module.exports = router;
