const config = require('../config/env');

/**
 * Structured HTTP Request Logger Middleware
 * PRIVACY RULE: NEVER LOG REQUEST BODIES, PDF BUFFERS, RESUME TEXT, JOB DESCRIPTIONS, OR SECRETS.
 */
function loggerMiddleware(req, res, next) {
    // Skip logging in test mode
    if (config.nodeEnv === 'test') {
        return next();
    }

    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const requestId = req.id || 'N/A';
        const timestamp = new Date().toISOString();

        // Safe operational log output
        console.log(`[${timestamp}] [${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });

    next();
}

module.exports = loggerMiddleware;
