/**
 * Server-Side Heuristic Scoring Engine
 */

const ACTION_VERBS = [
    'developed', 'built', 'created', 'designed', 'engineered', 'implemented',
    'managed', 'led', 'optimized', 'reduced', 'increased', 'improved',
    'architected', 'automated', 'delivered', 'integrated', 'spearheaded', 'launched'
];

function countActionVerbs(text) {
    const lower = text.toLowerCase();
    let count = 0;
    for (const verb of ACTION_VERBS) {
        const regex = new RegExp(`\\b${verb}\\b`, 'g');
        const matches = lower.match(regex);
        if (matches) count += matches.length;
    }
    return count;
}

function calculateScores(text, contactInfo, foundSections, skillsMatchResult) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const actionVerbCount = countActionVerbs(text);

    // 1. Skills Match Score (40% weight in ATS)
    const skillsMatchPct = skillsMatchResult.matchPct;

    // 2. Section Completeness Score (25% weight in ATS)
    const coreSections = ['experience', 'education', 'skills', 'projects', 'summary'];
    const matchedSectionsCount = coreSections.filter(sec => foundSections.includes(sec)).length;
    const sectionCompletenessPct = Math.round((matchedSectionsCount / coreSections.length) * 100);

    // 3. Contact Info Score (15% weight in ATS)
    let contactScore = 0;
    if (contactInfo.hasEmail) contactScore += 40;
    if (contactInfo.hasPhone) contactScore += 30;
    if (contactInfo.hasLinkedin) contactScore += 15;
    if (contactInfo.hasGithub) contactScore += 15;

    // 4. Resume Quality Score (max 100)
    let qualityScore = 50;
    if (wordCount >= 150 && wordCount <= 1200) qualityScore += 20;
    if (actionVerbCount >= 3) qualityScore += 15;
    if (contactInfo.hasEmail) qualityScore += 15;
    qualityScore = Math.min(100, Math.max(40, qualityScore));

    // 5. Formatting Compliance Score (20% weight in ATS)
    let formattingScore = 60;
    if (foundSections.length >= 3) formattingScore += 20;
    if (wordCount >= 100) formattingScore += 10;
    if (!/(.)\1{10,}/.test(text)) formattingScore += 10;
    formattingScore = Math.min(100, Math.max(50, formattingScore));

    // 6. Overall Heuristic ATS Score
    const atsScore = Math.round(
        (skillsMatchPct * 0.40) +
        (sectionCompletenessPct * 0.25) +
        (formattingScore * 0.20) +
        (contactScore * 0.15)
    );

    return {
        atsScore: Math.max(35, Math.min(98, atsScore)),
        skillsMatchPct: Math.max(25, Math.min(98, skillsMatchPct)),
        qualityScore: Math.max(40, Math.min(98, qualityScore)),
        formattingScore: Math.max(50, Math.min(98, formattingScore))
    };
}

module.exports = {
    calculateScores,
    countActionVerbs
};
