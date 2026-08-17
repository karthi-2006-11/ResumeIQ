const { parsePdfBuffer } = require('../services/pdf.service');
const { analyzeResume } = require('../services/resume-analysis.service');
const { saveAnalysisRecord } = require('../services/analysis-history.service');

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

        const buffer = req.file.buffer;
        const fileName = req.file.originalname || 'Resume.pdf';
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
