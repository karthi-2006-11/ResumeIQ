const test = require('node:test');
const assert = require('node:assert');

const { analyzeResume } = require('../src/services/resume-analysis.service');
const {
    extractStructuredResume,
    calculateVersion2Scores
} = require('../src/services/resume-intelligence.service');

const {
    generateImprovementPlan,
    SAFE_PASSIVE_REWRITES
} = require('../src/services/resume-improvement.service');

test('Workspace Core: Original resume analysis remains read-only and immutable', () => {
    const rawText = `
        Karthik Developer
        Email: karthik@example.com | Phone: 555-0199 | linkedin.com/in/karthik

        Summary
        Software Engineer with experience in JavaScript and Node.js.

        Skills
        JavaScript, Node.js, Express.js, PostgreSQL, Git.

        Experience
        Software Engineer | TechCorp
        • Responsible for maintaining backend services.
    `;

    const originalAnalysis = analyzeResume(rawText, 1, 'Karthik.pdf', '200 KB', 'Software Engineer');
    const origAtsScore = originalAnalysis.scores.atsScore;
    const origQualityScore = originalAnalysis.scores.qualityScore;

    // Simulate draft creation and editing
    const draft = {
        originalAnalysis: {
            scores: { ...originalAnalysis.scores },
            skillsFound: [...originalAnalysis.skillsFound]
        },
        summary: 'Updated summary text with more skills.',
        skills: [...originalAnalysis.skillsFound, 'Docker', 'TypeScript'],
        experience: [
            { title: 'Software Engineer', company: 'TechCorp', bullets: ['Maintained backend microservices reducing server downtime.'] }
        ]
    };

    // Assert original analysis object was NOT mutated
    assert.strictEqual(originalAnalysis.scores.atsScore, origAtsScore);
    assert.strictEqual(originalAnalysis.scores.qualityScore, origQualityScore);
    assert.strictEqual(originalAnalysis.skillsFound.includes('Docker'), false);
    assert.ok(draft.skills.includes('Docker'));
});

test('Deterministic Re-analysis & Comparison: Score diffs are calculated honestly from Engine v2.0', () => {
    const originalText = `
        Jane Candidate
        Email: jane@example.com
        Skills: JavaScript
    `;

    const origAnalysis = analyzeResume(originalText, 1, 'Jane.pdf', '100 KB', 'Software Engineer');

    // Case 1: Draft with ADDED skills & experience (Score increases)
    const improvedDraftText = `
        Jane Candidate
        Email: jane@example.com | Phone: 555-1234 | linkedin.com/in/janecandidate

        Summary
        Experienced Senior Software Engineer.

        Skills
        JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Git.

        Experience
        Software Engineer | TechCorp
        • Engineered real-time backend API reducing latency by 40%.
    `;

    const improvedStructured = extractStructuredResume(improvedDraftText, 1);
    const improvedScores = calculateVersion2Scores(improvedStructured, 'Software Engineer');

    const atsDiffPositive = improvedScores.atsScore - origAnalysis.scores.atsScore;
    assert.ok(atsDiffPositive > 0, 'ATS Score should increase when relevant skills and metrics are added');

    // Case 2: Draft with REMOVED content (Score decreases shown honestly)
    const degradedDraftText = `
        Jane Candidate
    `;
    const degradedStructured = extractStructuredResume(degradedDraftText, 1);
    const degradedScores = calculateVersion2Scores(degradedStructured, 'Software Engineer');

    const atsDiffNegative = degradedScores.atsScore - origAnalysis.scores.atsScore;
    assert.ok(atsDiffNegative < 0, 'ATS Score decrease must be shown honestly without artificial inflation');
});

test('Non-Fabrication & Suggestion Workflows: Accepting suggestions preserves facts without fake metrics', () => {
    const structured = extractStructuredResume(`
        John Dev
        Email: john@example.com

        Work Experience
        • Responsible for building REST APIs.
    `, 1);

    const improvementPlan = generateImprovementPlan(structured, 'Software Engineer');

    assert.ok(improvementPlan.rewriteSuggestions.length >= 1);
    const firstRewrite = improvementPlan.rewriteSuggestions[0];

    assert.strictEqual(firstRewrite.original, 'Responsible for building REST APIs.');
    assert.strictEqual(firstRewrite.suggestion, 'Built REST APIs.');

    // Verify ZERO fake metrics inserted
    assert.strictEqual(/\d+%/.test(firstRewrite.suggestion), false);
    assert.strictEqual(/\$\d+/.test(firstRewrite.suggestion), false);
});
