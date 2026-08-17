const mongoose = require('mongoose');
const {
    getAnalysesHistory,
    getAnalysisById,
    deleteAnalysisById
} = require('../services/analysis-history.service');

/**
 * Controller for GET /api/v1/analyses (List User History)
 */
async function getAnalysesHistoryHandler(req, res, next) {
    try {
        const userId = req.user ? req.user.id : null;
        const result = await getAnalysesHistory(userId, req.query);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            ...(result.disconnected ? { warning: 'Database disconnected. Operating in offline mode.' } : {})
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for GET /api/v1/analyses/:id (Single Item with Ownership Check)
 */
async function getSingleAnalysisHandler(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ANALYSIS_ID',
                    message: 'Provided analysis ID is not a valid ObjectId format.'
                }
            });
        }

        const analysisRecord = await getAnalysisById(id, userId);

        if (!analysisRecord) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ANALYSIS_NOT_FOUND',
                    message: `No analysis report found for ID: ${id}`
                }
            });
        }

        return res.status(200).json({
            success: true,
            analysis: analysisRecord
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for DELETE /api/v1/analyses/:id (Ownership Check)
 */
async function deleteAnalysisHandler(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ANALYSIS_ID',
                    message: 'Provided analysis ID is not a valid ObjectId format.'
                }
            });
        }

        const deleted = await deleteAnalysisById(id, userId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'ANALYSIS_NOT_FOUND',
                    message: `No analysis report found to delete for ID: ${id}`
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Analysis report deleted successfully.',
            deletedId: id
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAnalysesHistoryHandler,
    getSingleAnalysisHandler,
    deleteAnalysisHandler
};
