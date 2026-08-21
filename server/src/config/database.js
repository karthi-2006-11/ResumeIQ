const mongoose = require('mongoose');
const config = require('./env');

let isDbConnected = false;

/**
 * Connect to MongoDB database instance
 */
async function connectDB() {
    if (isDbConnected || mongoose.connection.readyState === 1) {
        isDbConnected = true;
        return mongoose.connection;
    }

    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(config.mongodbUri, {
            serverSelectionTimeoutMS: 2000 // 2 seconds timeout for fast fallback
        });

        isDbConnected = true;
        const safeUri = config.mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`[MongoDB] Connected successfully to: ${safeUri}`);

        mongoose.connection.on('disconnected', () => {
            isDbConnected = false;
            console.warn('[MongoDB] Connection lost.');
        });

        mongoose.connection.on('error', (err) => {
            isDbConnected = false;
            console.error('[MongoDB] Connection error:', err.message);
        });

        return mongoose.connection;
    } catch (err) {
        isDbConnected = false;
        console.warn(`[MongoDB] Database connection skipped or unreachable (${err.message}). Application operating in offline/fallback mode.`);
        return null;
    }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isDbConnected = false;
        console.log('[MongoDB] Disconnected.');
    }
}

/**
 * Check if MongoDB is currently connected
 */
function isConnected() {
    return isDbConnected && mongoose.connection.readyState === 1;
}

module.exports = {
    connectDB,
    disconnectDB,
    isConnected
};
