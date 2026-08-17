const config = require('../../config/env');
const { buildTaskPrompt } = require('./ai.prompt');
const { executeProviderCall } = require('./ai.provider');

const ALLOWED_TASKS = new Set([
    'resume-feedback',
    'job-match-explanation',
    'improvement-plan',
    'resume-rewrite',
    'bullet-improvement'
]);

/**
 * Validates AI Output JSON Schema
 */
function validateAiOutputSchema(output) {
    if (!output || typeof output !== 'object') return false;

    // Must contain valid objects / arrays
    const hasSummary = output.summaryFeedback && Array.isArray(output.summaryFeedback.strengths);
    const hasRecommendations = Array.isArray(output.priorityRecommendations);
    const hasBulletFeedback = Array.isArray(output.bulletFeedback);

    return hasSummary && hasRecommendations && hasBulletFeedback;
}

/**
 * Master AI Service Orchestrator
 */
async function generateAiInsights(task = 'resume-feedback', context = {}) {
    // 1. Task Validation
    if (!ALLOWED_TASKS.has(task)) {
        const error = new Error(`Unsupported AI task '${task}'. Allowed tasks: ${Array.from(ALLOWED_TASKS).join(', ')}`);
        error.code = 'UNSUPPORTED_AI_TASK';
        error.statusCode = 400;
        throw error;
    }

    // 2. Check if AI is enabled in config
    if (!config.aiEnabled && config.aiProvider !== 'mock') {
        return {
            available: false,
            reason: 'AI Enhancement features are currently disabled on this server.',
            task
        };
    }

    try {
        const { systemPrompt, userPrompt } = buildTaskPrompt(task, context);
        const rawResult = await executeProviderCall(task, context, systemPrompt, userPrompt);

        const isValid = validateAiOutputSchema(rawResult);
        if (!isValid) {
            console.warn('[AIService] Provider returned malformed output schema. Normalizing response.');
        }

        return {
            available: true,
            provider: config.aiProvider,
            model: config.aiModel,
            task,
            insights: {
                summaryFeedback: rawResult.summaryFeedback || { strengths: ['Valid technical structure'], improvements: ['Add quantifiable achievements'] },
                priorityRecommendations: Array.isArray(rawResult.priorityRecommendations) ? rawResult.priorityRecommendations : [],
                bulletFeedback: Array.isArray(rawResult.bulletFeedback) ? rawResult.bulletFeedback : [],
                jobMatchExplanation: rawResult.jobMatchExplanation || { strengths: [], gaps: [], overallExplanation: 'Resume alignment evaluated.' }
            }
        };
    } catch (err) {
        console.error('[AIService] Exception generating insights:', err.message);
        return {
            available: false,
            reason: `AI processing failed: ${err.message}`,
            task
        };
    }
}

module.exports = {
    ALLOWED_TASKS,
    generateAiInsights
};
