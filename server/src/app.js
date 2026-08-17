const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');

// Middleware Imports
const requestIdMiddleware = require('./middleware/request-id.middleware');
const loggerMiddleware = require('./middleware/logger.middleware');
const { generalLimiter, analysisLimiter, aiLimiter } = require('./middleware/rate-limit.middleware');
const notFoundHandler = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');

// Route Imports
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const analyzeRoutes = require('./routes/analyze.routes');
const historyRoutes = require('./routes/history.routes');
const jobMatchRoutes = require('./routes/job-match.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// 1. Security Headers Middleware via Helmet
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
                fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*']
            }
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
);

// 2. CORS Middleware Configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || origin === config.clientOrigin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy rejection: Origin not allowed.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
};

app.use(cors(corsOptions));

// 3. Request Tracking & Operational Logging
app.use(requestIdMiddleware);
app.use(loggerMiddleware);

// 4. Rate Limiting Middleware
app.use('/api', generalLimiter);
app.use(`/api/${config.apiVersion}/analyze`, analysisLimiter);
app.use(`/api/${config.apiVersion}/job-match`, analysisLimiter);
app.use(`/api/${config.apiVersion}/ai`, aiLimiter);

// 5. Request Body Parsing (Strict 1MB Limit)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 6. API Route Mounting
app.use('/api', healthRoutes);
app.use(`/api/${config.apiVersion}`, authRoutes);
app.use(`/api/${config.apiVersion}`, analyzeRoutes);
app.use(`/api/${config.apiVersion}`, historyRoutes);
app.use(`/api/${config.apiVersion}`, jobMatchRoutes);
app.use(`/api/${config.apiVersion}`, aiRoutes);

// 7. Centralized 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
