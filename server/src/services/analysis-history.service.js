const Analysis = require('../models/analysis.model');
const { isConnected } = require('../config/database');

/**
 * Data Access Layer for Persisted Resume Analyses with User Data Isolation
 */

/**
 * Persist Analysis Result to MongoDB
 */
async function saveAnalysisRecord(analysisPayload, userId = null) {
    if (!isConnected()) {
        return { saved: false, reason: 'Database disconnected' };
    }

    try {
        const cleanPayload = { ...analysisPayload };
        delete cleanPayload.rawText;
        delete cleanPayload.rawResumeText;

        if (userId) {
            cleanPayload.userId = userId;
        }

        const doc = new Analysis(cleanPayload);
        const savedDoc = await doc.save();

        return {
            saved: true,
            id: savedDoc._id.toString(),
            doc: savedDoc.toJSON()
        };
    } catch (err) {
        console.error('[AnalysisHistoryService] Failed to save analysis record:', err.message);
        return { saved: false, reason: err.message };
    }
}

/**
 * Get Paginated List of Saved Analyses (Isolated by User ID)
 */
async function getAnalysesHistory(userId = null, query = {}) {
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
    const total = await Analysis.countDocuments(filter);

    const docs = await Analysis.find(filter)
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
 * Get Single Analysis by ID and User Ownership Check
 */
async function getAnalysisById(id, userId = null) {
    if (!isConnected()) return null;
    const filter = userId ? { _id: id, userId } : { _id: id, userId: null };
    const doc = await Analysis.findOne(filter).exec();
    return doc ? doc.toJSON() : null;
}

/**
 * Delete Analysis by ID and User Ownership Check
 */
async function deleteAnalysisById(id, userId = null) {
    if (!isConnected()) return false;
    const filter = userId ? { _id: id, userId } : { _id: id, userId: null };
    const result = await Analysis.findOneAndDelete(filter).exec();
    return !!result;
}

module.exports = {
    saveAnalysisRecord,
    getAnalysesHistory,
    getAnalysisById,
    deleteAnalysisById
};
