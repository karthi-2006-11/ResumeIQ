const { verifyToken } = require('../services/auth.service');

/**
 * Middleware: Requires Valid Authentication Token
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication is required to access this resource.',
                ...(req.id ? { requestId: req.id } : {})
            }
        });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_AUTHORIZATION_HEADER',
                message: 'Authorization header must follow format: Bearer <token>',
                ...(req.id ? { requestId: req.id } : {})
            }
        });
    }

    const token = parts[1];

    try {
        const decoded = verifyToken(token);
        req.user = { id: decoded.sub };
        next();
    } catch (err) {
        return res.status(err.statusCode || 401).json({
            success: false,
            error: {
                code: err.code || 'INVALID_TOKEN',
                message: err.message || 'Invalid authentication token.',
                ...(req.id ? { requestId: req.id } : {})
            }
        });
    }
}

/**
 * Middleware: Optional Authentication Token (For Anonymous/Authenticated Uploads)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && typeof authHeader === 'string') {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            try {
                const decoded = verifyToken(parts[1]);
                req.user = { id: decoded.sub };
                return next();
            } catch (err) {
                // Ignore invalid token for optional auth, fallback to anonymous
            }
        }
    }

    req.user = null;
    next();
}

module.exports = {
    requireAuth,
    optionalAuth
};
