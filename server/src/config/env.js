const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5500',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resumeiq',
    apiVersion: 'v1',

    // JWT Authentication Configuration
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-replace-with-secure-random-string-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // AI Feature Flags & Configuration
    aiEnabled: process.env.AI_ENABLED === 'true',
    aiProvider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    aiModel: process.env.AI_MODEL || 'gemini-1.5-flash',
    aiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || ''
};

// Validate production security rules
if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('dev-jwt-secret')) {
        throw new Error('PRODUCTION ERROR: JWT_SECRET environment variable must be explicitly defined with a secure secret.');
    }
}

module.exports = config;
