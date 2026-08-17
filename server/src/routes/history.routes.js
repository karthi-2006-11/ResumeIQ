const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const {
    getAnalysesHistoryHandler,
    getSingleAnalysisHandler,
    deleteAnalysisHandler
} = require('../controllers/history.controller');

// GET /api/v1/analyses (Protected — returns current user's history)
router.get('/analyses', requireAuth, getAnalysesHistoryHandler);

// GET /api/v1/analyses/:id (Protected — returns user-owned report)
router.get('/analyses/:id', requireAuth, getSingleAnalysisHandler);

// DELETE /api/v1/analyses/:id (Protected — deletes user-owned report)
router.delete('/analyses/:id', requireAuth, deleteAnalysisHandler);

module.exports = router;
