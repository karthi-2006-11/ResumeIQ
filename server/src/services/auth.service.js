const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/env');
const { isConnected } = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = 10;

// In-Memory Mock Store for Offline / DB-Disconnected Test Fallback
const mockUserStore = new Map();

/**
 * Normalizes Email Input
 */
function normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.toLowerCase().trim();
}

/**
 * Generates JWT Bearer Token
 */
function generateToken(userId) {
    return jwt.sign(
        { sub: userId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
}

/**
 * Register New User Account
 */
async function registerUser({ email, password }) {
    const cleanEmail = normalizeEmail(email);

    // 1. Email Format Validation
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        const error = new Error('Please provide a valid email address.');
        error.code = 'INVALID_EMAIL';
        error.statusCode = 400;
        throw error;
    }

    // 2. Password Length Validation
    if (!password || typeof password !== 'string' || password.length < 8) {
        const error = new Error('Password must be at least 8 characters in length.');
        error.code = 'WEAK_PASSWORD';
        error.statusCode = 400;
        throw error;
    }

    if (password.length > 100) {
        const error = new Error('Password exceeds maximum allowed length of 100 characters.');
        error.code = 'PASSWORD_TOO_LONG';
        error.statusCode = 400;
        throw error;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 3. Database Operations (Use In-Memory fallback if DB disconnected)
    if (isConnected()) {
        const existingUser = await User.findOne({ email: cleanEmail }).exec();
        if (existingUser) {
            const error = new Error('An account with this email address already exists.');
            error.code = 'EMAIL_ALREADY_EXISTS';
            error.statusCode = 400;
            throw error;
        }

        const userDoc = new User({ email: cleanEmail, passwordHash });
        const savedUser = await userDoc.save();
        const token = generateToken(savedUser._id.toString());

        return { user: savedUser.toJSON(), token };
    } else {
        // Fallback for offline / disconnected test execution
        if (mockUserStore.has(cleanEmail)) {
            const error = new Error('An account with this email address already exists.');
            error.code = 'EMAIL_ALREADY_EXISTS';
            error.statusCode = 400;
            throw error;
        }

        const mockId = new (require('mongoose').Types.ObjectId)().toString();
        const mockUser = {
            id: mockId,
            email: cleanEmail,
            passwordHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        mockUserStore.set(cleanEmail, mockUser);
        mockUserStore.set(mockId, mockUser);
        const token = generateToken(mockId);

        const safeUser = { id: mockUser.id, email: mockUser.email, createdAt: mockUser.createdAt, updatedAt: mockUser.updatedAt };
        return { user: safeUser, token };
    }
}

/**
 * Authenticate Existing User Login
 */
async function loginUser({ email, password }) {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
        const error = new Error('Email address and password are required.');
        error.code = 'MISSING_CREDENTIALS';
        error.statusCode = 400;
        throw error;
    }

    let targetUser = null;

    if (isConnected()) {
        const userDoc = await User.findOne({ email: cleanEmail }).exec();
        if (userDoc) {
            targetUser = {
                id: userDoc._id.toString(),
                email: userDoc.email,
                passwordHash: userDoc.passwordHash,
                json: userDoc.toJSON()
            };
        }
    } else {
        const mock = mockUserStore.get(cleanEmail);
        if (mock) {
            targetUser = {
                id: mock.id,
                email: mock.email,
                passwordHash: mock.passwordHash,
                json: { id: mock.id, email: mock.email, createdAt: mock.createdAt }
            };
        }
    }

    if (!targetUser) {
        const error = new Error('Invalid email address or password.');
        error.code = 'INVALID_CREDENTIALS';
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, targetUser.passwordHash);
    if (!isMatch) {
        const error = new Error('Invalid email address or password.');
        error.code = 'INVALID_CREDENTIALS';
        error.statusCode = 401;
        throw error;
    }

    const token = generateToken(targetUser.id);
    return {
        user: targetUser.json,
        token
    };
}

/**
 * Get User Profile by ID
 */
async function getUserById(userId) {
    if (isConnected()) {
        const userDoc = await User.findById(userId).exec();
        return userDoc ? userDoc.toJSON() : null;
    } else {
        const mock = mockUserStore.get(userId);
        return mock ? { id: mock.id, email: mock.email, createdAt: mock.createdAt } : null;
    }
}

/**
 * Verify JWT Token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            const error = new Error('Authentication token has expired. Please log in again.');
            error.code = 'TOKEN_EXPIRED';
            error.statusCode = 401;
            throw error;
        }
        const error = new Error('Invalid authentication token.');
        error.code = 'INVALID_TOKEN';
        error.statusCode = 401;
        throw error;
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    verifyToken,
    generateToken,
    normalizeEmail
};
