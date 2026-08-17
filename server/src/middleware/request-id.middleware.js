const crypto = require('crypto');

/**
 * Lightweight Request ID Middleware
 * Assigns or validates X-Request-ID header for operation tracking
 */
function requestIdMiddleware(req, res, next) {
    let requestId = req.headers['x-request-id'];

    // Validate incoming requestId format (alphanumeric & dashes, max 64 chars)
    if (requestId && typeof requestId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(requestId)) {
        req.id = requestId;
    } else {
        req.id = crypto.randomUUID();
    }

    res.setHeader('X-Request-ID', req.id);
    next();
}

module.exports = requestIdMiddleware;
