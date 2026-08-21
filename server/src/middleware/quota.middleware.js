const { reserveQuota, releaseQuota } = require('../services/usage.service');

/**
 * Creates Quota Enforcement Middleware for Authenticated Users
 * @param {'analysis'|'jobMatch'} quotaType
 */
function createQuotaMiddleware(quotaType) {
    return async function (req, res, next) {
        // Guests (unauthenticated users) bypass account quota and remain protected by IP rate limiter
        if (!req.user || !req.user.id) {
            return next();
        }

        try {
            const reservation = await reserveQuota(req.user.id, quotaType);
            if (!reservation.success) {
                return res.status(429).json({
                    success: false,
                    error: {
                        code: 'QUOTA_EXCEEDED',
                        message: reservation.message || `Monthly ${quotaType} quota limit reached for your account.`,
                        quota: reservation.usage
                    }
                });
            }

            // Refund/release reserved slot if request processing fails (status >= 400)
            res.on('finish', async () => {
                if (res.statusCode >= 400) {
                    await releaseQuota(req.user.id, quotaType);
                }
            });

            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = {
    checkAnalysisQuota: createQuotaMiddleware('analysis'),
    checkJobMatchQuota: createQuotaMiddleware('jobMatch')
};
