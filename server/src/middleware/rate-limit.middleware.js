const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Standard Error Handler for Rate Limiters
 */
function createRateLimitHandler(code, message) {
    return (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: code || 'RATE_LIMITED',
                message: message || 'Too many requests. Please try again later.',
                ...(req.id ? { requestId: req.id } : {})
            }
        });
    };
}

const isTestMode = config.nodeEnv === 'test';

// 1. General API Rate Limiter (100 req / 15 min)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestMode ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('RATE_LIMITED', 'Too many requests from this IP. Please try again in 15 minutes.')
});

// 2. Heavy Resume Analysis & Job Match Limiter (20 req / 15 min)
const analysisLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestMode ? 1000 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('ANALYSIS_RATE_LIMITED', 'Analysis quota exceeded for this IP. Please try again in 15 minutes.')
});

// 3. AI Insights Rate Limiter (10 req / 15 min)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestMode ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('AI_RATE_LIMITED', 'AI Insights request quota exceeded for this IP. Please try again in 15 minutes.')
});

// 4. Auth Endpoint Brute-Force Protection Limiter (15 req / 15 min)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTestMode ? 1000 : 15,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('AUTH_RATE_LIMITED', 'Too many authentication attempts. Please try again in 15 minutes.')
});

module.exports = {
    generalLimiter,
    analysisLimiter,
    aiLimiter,
    authLimiter
};
