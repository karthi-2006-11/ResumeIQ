const config = require('../../config/env');

/**
 * Mock Provider for Offline Development & Unit Testing
 */
async function generateMockInsight(task, context) {
    const targetRole = context.targetRole || 'Software Engineer';
    const missing = context.skillsMissing || [];

    return {
        summaryFeedback: {
            strengths: [
                'Clear technical focus on modern development stack.',
                'Good sectioning and readable formatting.'
            ],
            improvements: [
                `Consider adding specific project outcomes related to ${targetRole}.`,
                'Ensure your contact links include a professional GitHub repository.'
            ]
        },
        priorityRecommendations: [
            {
                priority: 'high',
                title: missing.length > 0 ? `Highlight ${missing[0]} Experience` : 'Quantify Achievement Impact',
                reason: missing.length > 0 ? `${missing[0]} is a frequent requirement for ${targetRole} positions.` : 'Measurable results demonstrate engineering effectiveness.',
                action: missing.length > 0 ? `Add a project bullet point demonstrating your work with ${missing[0]}.` : 'Include metrics (e.g., latency reduction, test coverage, user volume) where applicable.'
            },
            {
                priority: 'medium',
                title: 'Optimize Action Verbs',
                reason: 'Strong verbs like "Architected", "Engineered", and "Optimized" create a stronger impression.',
                action: 'Replace passive phrases like "worked on" with active technical leadership verbs.'
            }
        ],
        bulletFeedback: [
            {
                original: 'Built a web application using JavaScript.',
                issue: 'Phrase is generic and lacks technical scope.',
                suggestion: 'Engineered a responsive web application using ES6+ JavaScript and RESTful APIs, optimizing page load times.'
            }
        ],
        jobMatchExplanation: {
            strengths: [
                'Solid foundation in core web technologies.',
                'Good structural alignment with standard engineering roles.'
            ],
            gaps: missing.slice(0, 2),
            overallExplanation: `Your resume demonstrates good foundational alignment for ${targetRole}. Addressing missing keywords like ${missing.slice(0, 2).join(' and ') || 'advanced tools'} will enhance recruiter visibility.`
        }
    };
}

/**
 * Live Fetch Provider (Supports Gemini API)
 */
async function generateLiveInsight(systemPrompt, userPrompt) {
    if (!config.aiApiKey) {
        throw new Error('AI API Key is missing. Set AI_API_KEY in server environment.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.aiModel}:generateContent?key=${config.aiApiKey}`;

        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
                ],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json'
                }
            })
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`AI Provider HTTP Error ${res.status}: ${errBody}`);
        }

        const data = await res.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawJsonText) {
            throw new Error('Empty response payload received from AI Provider.');
        }

        return JSON.parse(rawJsonText);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            const timeoutErr = new Error('AI Provider request timed out (5s limit).');
            timeoutErr.code = 'AI_TIMEOUT';
            throw timeoutErr;
        }
        throw err;
    }
}

/**
 * Main Provider Dispatcher
 */
async function executeProviderCall(task, context, systemPrompt, userPrompt) {
    // If AI is set to 'mock' or if running unit tests without API Key, use MockProvider
    if (config.aiProvider === 'mock' || !config.aiApiKey) {
        return await generateMockInsight(task, context);
    }

    try {
        return await generateLiveInsight(systemPrompt, userPrompt);
    } catch (err) {
        console.warn(`[AIProvider] Live provider failed (${err.message}). Falling back to Mock Insight.`);
        return await generateMockInsight(task, context);
    }
}

module.exports = {
    generateMockInsight,
    generateLiveInsight,
    executeProviderCall
};
