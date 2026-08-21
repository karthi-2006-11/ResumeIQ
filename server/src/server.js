const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');

async function startServer() {
    // 1. Connect to MongoDB (Non-blocking fallback if DB offline)
    await connectDB();

    // 2. Start HTTP Express Server
    const server = app.listen(config.port, config.host, () => {
        console.log(`=======================================================`);
        console.log(`🚀 ResumeIQ API Server running on ${config.host}:${config.port}`);
        console.log(`🌐 Environment: ${config.nodeEnv}`);
        console.log(`🔒 Allowed Origin: ${config.clientOrigin}`);
        console.log(`🤖 AI Status: ${config.aiEnabled ? 'Enabled' : 'Disabled'} (Provider: ${config.aiProvider})`);
        console.log(`=======================================================`);
    });

    // 3. Graceful Shutdown Handlers
    async function gracefulShutdown(signal) {
        console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

        // Close HTTP Server (stop accepting new connections)
        server.close(async () => {
            console.log('[Server] Closed HTTP connections.');

            try {
                // Close Mongoose connection
                await disconnectDB();
                console.log('[Server] Disconnected database. Shutdown complete.');
                process.exit(0);
            } catch (err) {
                console.error('[Server] Error during database shutdown:', err);
                process.exit(1);
            }
        });

        // Force shutdown after 10s if hanging
        setTimeout(() => {
            console.error('[Server] Forced shutdown due to timeout.');
            process.exit(1);
        }, 10000);
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Process Safety Handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[Server] Uncaught Exception thrown:', error);
        process.exit(1);
    });
}

startServer().catch((err) => {
    console.error('[Server] Critical startup error:', err);
    process.exit(1);
});
