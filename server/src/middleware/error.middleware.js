const config = require('../config/env');

/**
 * Centralized Application Error Middleware
 * Enforces uniform JSON error responses and production error sanitization
 */
function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || err.status || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected server error occurred.';

    // 1. Handle Multer File Size Limit Errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            statusCode = 413;
            code = 'FILE_TOO_LARGE';
            message = 'Uploaded file exceeds the maximum 5MB size limit.';
        } else {
            statusCode = 400;
            code = 'FILE_UPLOAD_ERROR';
            message = `File upload error: ${err.message}`;
        }
    }

    // 2. Handle JSON Body Parse Errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400;
        code = 'INVALID_JSON_BODY';
        message = 'Malformed JSON payload in request body.';
    }

    // 3. Handle Mongoose CastError / ValidationError
    if (err.name === 'CastError') {
        statusCode = 400;
        code = 'INVALID_ID_FORMAT';
        message = 'Invalid ID format provided.';
    }

    // 4. Production Mode Sanitization for Server Errors (500)
    if (config.nodeEnv === 'production' && statusCode === 500) {
        console.error(`[INTERNAL ERROR ${req.id || 'N/A'}]`, err);
        message = 'An unexpected internal server error occurred.';
    } else if (config.nodeEnv !== 'test' && statusCode >= 500) {
        console.error(`[SERVER ERROR ${req.id || 'N/A'}] ${err.stack || err.message}`);
    }

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(req.id ? { requestId: req.id } : {})
        }
    });
}

module.exports = errorHandler;
