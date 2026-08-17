/**
 * Centralized 404 Not Found Middleware
 * Returns predictable JSON error response for unmatched endpoints.
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            ...(req.id ? { requestId: req.id } : {})
        }
    });
}

module.exports = notFoundHandler;
