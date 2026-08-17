const { registerUser, loginUser, getUserById } = require('../services/auth.service');

/**
 * Controller for POST /api/v1/auth/register
 */
async function registerHandler(req, res, next) {
    try {
        const { email, password } = req.body || {};
        const result = await registerUser({ email, password });

        return res.status(201).json({
            success: true,
            user: result.user,
            token: result.token
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for POST /api/v1/auth/login
 */
async function loginHandler(req, res, next) {
    try {
        const { email, password } = req.body || {};
        const result = await loginUser({ email, password });

        return res.status(200).json({
            success: true,
            user: result.user,
            token: result.token
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for GET /api/v1/auth/me (Protected)
 */
async function getCurrentUserHandler(req, res, next) {
    try {
        const userId = req.user.id;
        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User account profile not found.'
                }
            });
        }

        return res.status(200).json({
            success: true,
            user
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for POST /api/v1/auth/logout (Stateless)
 */
function logoutHandler(req, res) {
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully. Please clear authentication token client-side.'
    });
}

module.exports = {
    registerHandler,
    loginHandler,
    getCurrentUserHandler,
    logoutHandler
};
