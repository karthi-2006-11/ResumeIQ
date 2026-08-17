const { isConnected } = require('../config/database');
const config = require('../config/env');

/**
 * Controller for GET /api/health (Liveness Probe)
 */
function getHealthHandler(req, res) {
    const dbConnected = isConnected();

    return res.status(200).json({
        success: true,
        service: 'ResumeIQ API',
        status: 'healthy',
        version: '1.0.0',
        environment: config.nodeEnv,
        database: {
            status: dbConnected ? 'connected' : 'disconnected'
        },
        ai: {
            enabled: config.aiEnabled,
            provider: config.aiProvider
        },
        timestamp: new Date().toISOString()
    });
}

/**
 * Controller for GET /api/ready (Readiness Probe)
 */
function getReadinessHandler(req, res) {
    const dbConnected = isConnected();

    if (dbConnected) {
        return res.status(200).json({
            success: true,
            ready: true,
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } else {
        return res.status(503).json({
            success: false,
            ready: false,
            database: 'disconnected',
            message: 'Database dependency is unavailable.',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = {
    getHealthHandler,
    getReadinessHandler
};
