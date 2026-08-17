const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function loadConfig(envOverride = process.env) {
    const nodeEnv = envOverride.NODE_ENV || 'development';

    const config = {
        port: parseInt(envOverride.PORT || '5000', 10),
        nodeEnv: nodeEnv,
        clientOrigin: envOverride.CLIENT_ORIGIN || 'http://localhost:5500',
        mongodbUri: envOverride.MONGODB_URI || 'mongodb://127.0.0.1:27017/resumeiq',
        apiVersion: 'v1',

        // JWT Authentication Configuration
        jwtSecret: envOverride.JWT_SECRET || (nodeEnv === 'test' ? 'test-jwt-secret-key-123456789' : 'dev-jwt-secret-replace-with-secure-random-string-in-production'),
        jwtExpiresIn: envOverride.JWT_EXPIRES_IN || '7d',

        // AI Feature Flags & Configuration
        aiEnabled: envOverride.AI_ENABLED === 'true',
        aiProvider: (envOverride.AI_PROVIDER || 'mock').toLowerCase(),
        aiModel: envOverride.AI_MODEL || 'gemini-1.5-flash',
        aiApiKey: envOverride.AI_API_KEY || envOverride.GEMINI_API_KEY || envOverride.OPENAI_API_KEY || ''
    };

    validateConfig(config);
    return config;
}

function validateConfig(config) {
    if (config.nodeEnv === 'production') {
        if (!config.jwtSecret || config.jwtSecret.includes('dev-jwt-secret')) {
            throw new Error('PRODUCTION CONFIG ERROR: JWT_SECRET environment variable must be explicitly defined with a secure secret.');
        }

        if (config.aiEnabled && config.aiProvider !== 'mock' && !config.aiApiKey) {
            throw new Error(`PRODUCTION CONFIG ERROR: AI_ENABLED is true for provider "${config.aiProvider}", but no AI_API_KEY was provided.`);
        }

        if (config.clientOrigin === '*') {
            console.warn('[SECURITY WARNING] CLIENT_ORIGIN is set to wildcard "*". For secure production deployment, specify explicit domain origins.');
        }
    }
}

const defaultConfig = loadConfig(process.env);
defaultConfig.loadConfig = loadConfig;
defaultConfig.validateConfig = validateConfig;

module.exports = defaultConfig;
