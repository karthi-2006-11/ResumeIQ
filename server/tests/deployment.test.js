const test = require('node:test');
const assert = require('node:assert');

const envConfig = require('../src/config/env');
const Analysis = require('../src/models/analysis.model');
const JobMatch = require('../src/models/job-match.model');

test('Environment Validation: Fails fast in production when JWT_SECRET is missing or default', () => {
    const invalidEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'dev-jwt-secret-replace-with-secure-random-string-in-production'
    };

    assert.throws(() => {
        envConfig.loadConfig(invalidEnv);
    }, /PRODUCTION CONFIG ERROR: JWT_SECRET/);
});

test('Environment Validation: Fails fast in production when AI_ENABLED is true without AI_API_KEY', () => {
    const invalidEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'super-secure-production-jwt-key-123456789',
        AI_ENABLED: 'true',
        AI_PROVIDER: 'gemini',
        AI_API_KEY: ''
    };

    assert.throws(() => {
        envConfig.loadConfig(invalidEnv);
    }, /PRODUCTION CONFIG ERROR: AI_ENABLED is true/);
});

test('Environment Validation: Valid production config passes validation cleanly', () => {
    const validEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'valid-secure-production-jwt-secret-key-32-chars',
        CLIENT_ORIGIN: 'https://resumeiq.example.com',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/resumeiq_prod',
        AI_ENABLED: 'false'
    };

    const cfg = envConfig.loadConfig(validEnv);
    assert.strictEqual(cfg.nodeEnv, 'production');
    assert.strictEqual(cfg.clientOrigin, 'https://resumeiq.example.com');
});

test('Secret & Privacy Audit: Mongoose models do not store raw PDF buffers, raw resume text, or raw JD text', () => {
    const analysisPaths = Object.keys(Analysis.schema.paths);
    assert.strictEqual(analysisPaths.includes('pdfBuffer'), false);
    assert.strictEqual(analysisPaths.includes('rawResumeText'), false);

    const jobMatchPaths = Object.keys(JobMatch.schema.paths);
    assert.strictEqual(jobMatchPaths.includes('rawJdText'), false);
    assert.strictEqual(jobMatchPaths.includes('rawResumeText'), false);
});
