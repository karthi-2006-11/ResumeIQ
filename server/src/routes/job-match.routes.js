const express = require('express');
const router = express.Router();
const { handlePdfUpload } = require('../middleware/upload.middleware');
const { optionalAuth, requireAuth } = require('../middleware/auth.middleware');
const {
    analyzeJobMatchHandler,
    getJobMatchesHistoryHandler,
    getSingleJobMatchHandler,
    deleteJobMatchHandler
} = require('../controllers/job-match.controller');

// POST /api/v1/job-match (Supports both authenticated & anonymous uploads)
router.post('/job-match', optionalAuth, handlePdfUpload, analyzeJobMatchHandler);

// GET /api/v1/job-matches (Protected — returns current user's history)
router.get('/job-matches', requireAuth, getJobMatchesHistoryHandler);

// GET /api/v1/job-matches/:id (Protected — returns user-owned match report)
router.get('/job-matches/:id', requireAuth, getSingleJobMatchHandler);

// DELETE /api/v1/job-matches/:id (Protected — deletes user-owned match report)
router.delete('/job-matches/:id', requireAuth, deleteJobMatchHandler);

module.exports = router;
