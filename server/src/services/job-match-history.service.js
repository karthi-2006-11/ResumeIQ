const JobMatch = require('../models/job-match.model');
const { isConnected } = require('../config/database');

/**
 * Data Access Layer for Persisted Job Matches with User Data Isolation
 */

/**
 * Persist Job Match Result to MongoDB
 */
async function saveJobMatchRecord(matchPayload, userId = null) {
    if (!isConnected()) {
        return { saved: false, reason: 'Database disconnected' };
    }

    try {
        const cleanPayload = { ...matchPayload };
        delete cleanPayload.rawJdText;
        delete cleanPayload.rawResumeText;

        if (userId) {
            cleanPayload.userId = userId;
        }

        const doc = new JobMatch(cleanPayload);
        const savedDoc = await doc.save();

        return {
            saved: true,
            id: savedDoc._id.toString(),
            doc: savedDoc.toJSON()
        };
    } catch (err) {
        console.error('[JobMatchHistoryService] Failed to save job match record:', err.message);
        return { saved: false, reason: err.message };
    }
}

/**
 * Get Paginated List of Saved Job Matches (Isolated by User ID)
 */
async function getJobMatchesHistory(userId = null, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));

    if (!isConnected()) {
        return {
            data: [],
            pagination: { page, limit, total: 0, pages: 0 },
            disconnected: true
        };
    }

    const filter = userId ? { userId } : { userId: null };
    const skip = (page - 1) * limit;
    const total = await JobMatch.countDocuments(filter);

    const docs = await JobMatch.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const data = docs.map(doc => doc.toJSON());
    const pages = Math.ceil(total / limit) || 1;

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            pages
        }
    };
}

/**
 * Get Single Job Match by ID and User Ownership Check
 */
async function getJobMatchById(id, userId = null) {
    if (!isConnected()) return null;
    const filter = userId ? { _id: id, userId } : { _id: id, userId: null };
    const doc = await JobMatch.findOne(filter).exec();
    return doc ? doc.toJSON() : null;
}

/**
 * Delete Job Match by ID and User Ownership Check
 */
async function deleteJobMatchById(id, userId = null) {
    if (!isConnected()) return false;
    const filter = userId ? { _id: id, userId } : { _id: id, userId: null };
    const result = await JobMatch.findOneAndDelete(filter).exec();
    return !!result;
}

module.exports = {
    saveJobMatchRecord,
    getJobMatchesHistory,
    getJobMatchById,
    deleteJobMatchById
};
