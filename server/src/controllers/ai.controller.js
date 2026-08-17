const { generateAiInsights } = require('../services/ai/ai.service');

/**
 * Controller for POST /api/v1/ai/analyze
 */
async function analyzeAiInsightsHandler(req, res, next) {
    try {
        const { task = 'resume-feedback', targetRole = 'Software Engineer', resumeContext = {}, jobMatchContext = null } = req.body || {};

        const context = {
            targetRole,
            summary: resumeContext.summary || '',
            skillsFound: resumeContext.skillsFound || [],
            skillsMissing: resumeContext.skillsMissing || [],
            jobMatch: jobMatchContext || resumeContext.jobMatch || null
        };

        const aiResult = await generateAiInsights(task, context);

        return res.status(200).json({
            success: true,
            ai: aiResult
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    analyzeAiInsightsHandler
};
