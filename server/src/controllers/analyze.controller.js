const path = require('path');
const { parsePdfBuffer } = require('../services/pdf.service');
const { analyzeResume } = require('../services/resume-analysis.service');
const { saveAnalysisRecord } = require('../services/analysis-history.service');

/**
 * Sanitizes original filename to prevent path traversal and control characters
 * @param {string} filename
 * @returns {string}
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') return 'Resume.pdf';
    let clean = path.basename(filename).replace(/[\/\\]/g, '');
    clean = clean.replace(/[\x00-\x1F\x7F<>:"|?*]/g, '').trim();
    return clean || 'Resume.pdf';
}

/**
 * Controller for POST /api/v1/analyze
 */
async function analyzeResumeHandler(req, res, next) {
    try {
        // 1. Validate File Attachment
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'No resume PDF file uploaded. Please attach a valid PDF document.'
                }
            });
        }

        // 2. Check Empty File (Zero-Byte Upload Guard)
        if (req.file.size === 0 || req.file.buffer.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'EMPTY_FILE',
                    message: 'The uploaded file is empty (0 bytes). Please attach a valid PDF document.'
                }
            });
        }

        const buffer = req.file.buffer;
        const fileName = sanitizeFilename(req.file.originalname);
        const fileSizeFormatted = (req.file.size / 1024).toFixed(1) + ' KB';
        const targetRole = req.body.targetRole || 'Software Engineer';
        const userId = req.user ? req.user.id : null;

        // 2. Extract PDF Text & Perform Heuristic Analysis
        const { text, numPages } = await parsePdfBuffer(buffer);
        const analysisResult = analyzeResume(text, numPages, fileName, fileSizeFormatted, targetRole);

        // 3. Save to MongoDB (Attaches userId if authenticated)
        const persistenceResult = await saveAnalysisRecord(analysisResult, userId);
        if (persistenceResult.saved && persistenceResult.id) {
            analysisResult.id = persistenceResult.id;
        }

        return res.status(200).json({
            success: true,
            analysis: analysisResult,
            persistence: {
                saved: persistenceResult.saved,
                ...(persistenceResult.id ? { id: persistenceResult.id } : {})
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    analyzeResumeHandler
};
