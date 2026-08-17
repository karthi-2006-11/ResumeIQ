const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rate-limit.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const {
    registerHandler,
    loginHandler,
    getCurrentUserHandler,
    logoutHandler
} = require('../controllers/auth.controller');

// POST /api/v1/auth/register
router.post('/auth/register', authLimiter, registerHandler);

// POST /api/v1/auth/login
router.post('/auth/login', authLimiter, loginHandler);

// GET /api/v1/auth/me (Protected)
router.get('/auth/me', requireAuth, getCurrentUserHandler);

// POST /api/v1/auth/logout
router.post('/auth/logout', logoutHandler);

module.exports = router;
