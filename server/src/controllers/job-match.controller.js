const mongoose = require('mongoose');
const { parsePdfBuffer } = require('../services/pdf.service');
const { analyzeResume } = require('../services/resume-analysis.service');
const { compareResumeToJobDescription } = require('../services/job-match.service');
const {
    saveJobMatchRecord,
    getJobMatchesHistory,
    getJobMatchById,
    deleteJobMatchById
} = require('../services/job-match-history.service');

const MAX_JD_CHAR_LIMIT = 50000;

/**
 * Controller for POST /api/v1/job-match
 */
async function analyzeJobMatchHandler(req, res, next) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'No resume PDF file uploaded. Please attach a valid PDF document.'
                }
            });
        }

        const jobDescription = (req.body.jobDescription || '').trim();
        if (!jobDescription || jobDescription.length < 20) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_JOB_DESCRIPTION',
                    message: 'Please provide a valid job description (minimum 20 characters).'
                }
            });
        }

        if (jobDescription.length > MAX_JD_CHAR_LIMIT) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'JOB_DESCRIPTION_TOO_LARGE',
                    message: `Job description exceeds maximum allowed length of ${MAX_JD_CHAR_LIMIT} characters.`
                }
            });
        }

        const buffer = req.file.buffer;
        const fileName = req.file.originalname || 'Resume.pdf';
        const fileSizeFormatted = (req.file.size / 1024).toFixed(1) + ' KB';
        const targetRole = req.body.targetRole || 'Software Engineer';
        const userId = req.user ? req.user.id : null;

        const { text, numPages } = await parsePdfBuffer(buffer);
        const resumeAnalysis = analyzeResume(text, numPages, fileName, fileSizeFormatted, targetRole);
        const matchResult = compareResumeToJobDescription(resumeAnalysis, jobDescription, targetRole);

        const persistenceResult = await saveJobMatchRecord({
            targetRole,
            jobMatch: matchResult.jobMatch,
            metadata: matchResult.metadata
        }, userId);

        if (persistenceResult.saved && persistenceResult.id) {
            matchResult.id = persistenceResult.id;
        }

        return res.status(200).json({
            success: true,
            analysis: resumeAnalysis,
            jobMatch: matchResult.jobMatch,
            metadata: matchResult.metadata,
            persistence: {
                saved: persistenceResult.saved,
                ...(persistenceResult.id ? { id: persistenceResult.id } : {})
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for GET /api/v1/job-matches (List User History)
 */
async function getJobMatchesHistoryHandler(req, res, next) {
    try {
        const userId = req.user ? req.user.id : null;
        const result = await getJobMatchesHistory(userId, req.query);
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
 * Controller for GET /api/v1/job-matches/:id (Single Item with Ownership Validation)
 */
async function getSingleJobMatchHandler(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_JOB_MATCH_ID',
                    message: 'Provided job match ID is not a valid ObjectId format.'
                }
            });
        }

        const matchRecord = await getJobMatchById(id, userId);
        if (!matchRecord) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'JOB_MATCH_NOT_FOUND',
                    message: `No job match report found for ID: ${id}`
                }
            });
        }

        return res.status(200).json({
            success: true,
            jobMatch: matchRecord
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Controller for DELETE /api/v1/job-matches/:id (Ownership Validation)
 */
async function deleteJobMatchHandler(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_JOB_MATCH_ID',
                    message: 'Provided job match ID is not a valid ObjectId format.'
                }
            });
        }

        const deleted = await deleteJobMatchById(id, userId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'JOB_MATCH_NOT_FOUND',
                    message: `No job match report found to delete for ID: ${id}`
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Job match report deleted successfully.',
            deletedId: id
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    analyzeJobMatchHandler,
    getJobMatchesHistoryHandler,
    getSingleJobMatchHandler,
    deleteJobMatchHandler
};
