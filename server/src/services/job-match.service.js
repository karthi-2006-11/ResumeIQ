const { normalizeJdText, detectJdSections, extractJdSkills, extractJdKeywords } = require('./jd-analysis.service');
const { SKILL_DICTIONARY } = require('./resume-intelligence.service');

/**
 * Checks if a JD skill matches any candidate skill using Canonical Names and Alias Maps.
 */
function isSkillMatch(jdSkill, candidateSkills) {
    if (!jdSkill || !candidateSkills || candidateSkills.length === 0) return false;

    const lowerJd = jdSkill.toLowerCase().trim();

    // 1. Direct match
    if (candidateSkills.some(s => s.toLowerCase().trim() === lowerJd)) return true;

    // 2. Find Canonical Entry for JD skill
    const skillEntry = SKILL_DICTIONARY.find(entry =>
        entry.name.toLowerCase() === lowerJd || entry.aliases.includes(lowerJd)
    );

    if (!skillEntry) return false;

    // 3. Check if candidate possesses any alias of this skill entry
    return candidateSkills.some(candSkill => {
        const lowerCand = candSkill.toLowerCase().trim();
        return candSkill === skillEntry.name || skillEntry.aliases.includes(lowerCand);
    });
}

/**
 * Server-Side Master Job Match Comparison Engine (Version 2.0 Alias-Aware Matching)
 */
function compareResumeToJobDescription(resumeAnalysis, rawJdText, targetRole) {
    const jdText = normalizeJdText(rawJdText);
    const wordCount = jdText.split(/\s+/).filter(Boolean).length;

    // Handle empty or very short JDs
    if (wordCount < 10) {
        const error = new Error('Job description text is too short to perform a meaningful match analysis (minimum 10 words).');
        error.code = 'INVALID_JOB_DESCRIPTION';
        error.statusCode = 400;
        throw error;
    }

    const jdSkillsResult = extractJdSkills(jdText);
    const jdKeywords = extractJdKeywords(jdText);
    const jdSections = detectJdSections(jdText);

    const resumeSkills = resumeAnalysis.skillsFound || [];

    // 1. Required Skills Alias-Aware Match
    const requiredSkills = jdSkillsResult.requiredSkills;
    const matchingRequired = requiredSkills.filter(s => isSkillMatch(s, resumeSkills));
    const missingRequired = requiredSkills.filter(s => !isSkillMatch(s, resumeSkills));
    const requiredScore = requiredSkills.length > 0
        ? Math.round((matchingRequired.length / requiredSkills.length) * 100)
        : 75;

    // 2. Preferred Skills Alias-Aware Match
    const preferredSkills = jdSkillsResult.preferredSkills;
    const matchingPreferred = preferredSkills.filter(s => isSkillMatch(s, resumeSkills));
    const missingPreferred = preferredSkills.filter(s => !isSkillMatch(s, resumeSkills));
    const preferredScore = preferredSkills.length > 0
        ? Math.round((matchingPreferred.length / preferredSkills.length) * 100)
        : 80;

    // 3. Keyword Match
    const matchingKeywords = [];
    const missingKeywords = [];

    for (const kw of jdKeywords) {
        const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const summaryText = resumeAnalysis.summary || '';
        const foundInSkills = resumeSkills.some(s => isSkillMatch(kw, [s]) || kwRegex.test(s));

        if (foundInSkills || kwRegex.test(summaryText)) {
            matchingKeywords.push(kw);
        } else {
            missingKeywords.push(kw);
        }
    }

    const keywordScore = jdKeywords.length > 0
        ? Math.round((matchingKeywords.length / jdKeywords.length) * 100)
        : 70;

    // 4. Target Role Relevance
    const roleRelevanceScore = resumeAnalysis.scores?.atsScore || 75;

    // 5. Experience & Section Signals
    let experienceScore = 60;
    if (resumeAnalysis.sectionsFound?.includes('experience')) experienceScore += 20;
    if (resumeAnalysis.sectionsFound?.includes('projects')) experienceScore += 20;
    experienceScore = Math.min(100, experienceScore);

    // 6. Transparent Heuristic Overall Match Score (Weights: 40%, 15%, 20%, 15%, 10%)
    const matchScore = Math.round(
        (requiredScore * 0.40) +
        (preferredScore * 0.15) +
        (keywordScore * 0.20) +
        (roleRelevanceScore * 0.15) +
        (experienceScore * 0.10)
    );

    // All matching vs missing skills
    const matchingSkills = [...new Set([...matchingRequired, ...matchingPreferred])];
    const missingSkills = [...new Set([...missingRequired, ...missingPreferred])];

    // Generate Tailored Recommendations
    const recommendations = [];

    if (missingRequired.length > 0) {
        recommendations.push({
            title: `Address Core Required Skills (${missingRequired.slice(0, 2).join(', ')})`,
            desc: `The job description specifies ${missingRequired.slice(0, 2).join(', ')} as key requirements. If you have experience with these tools, highlight them in your project or experience bullets.`
        });
    }

    if (missingKeywords.length > 0) {
        recommendations.push({
            title: `Incorporate High-Frequency Terms (${missingKeywords.slice(0, 2).join(', ')})`,
            desc: `Consider referencing keywords like "${missingKeywords.slice(0, 2).join('" and "')}" to strengthen alignment with the job posting.`
        });
    }

    if (matchScore >= 80) {
        recommendations.push({
            title: 'Strong Job Alignment',
            desc: 'Your resume covers the primary requirements of this job description. Make sure your most relevant achievements are positioned near the top of your experience section.'
        });
    } else {
        recommendations.push({
            title: 'Tailor Project Highlights',
            desc: 'Align your project bullet points to direct responsibilities mentioned in the job description.'
        });
    }

    const summary = `Job Match: Your resume shows a ${matchScore}% heuristic match for this position. Matched ${matchingSkills.length} skills and ${matchingKeywords.length} keywords.`;

    return {
        version: '2.0',
        mode: 'backend',
        targetRole: targetRole || 'Software Engineer',

        jobMatch: {
            matchScore: Math.max(30, Math.min(98, matchScore)),

            scores: {
                requiredSkills: requiredScore,
                preferredSkills: preferredScore,
                keywords: keywordScore,
                roleRelevance: roleRelevanceScore,
                experience: experienceScore
            },

            requiredSkills,
            preferredSkills,

            matchingSkills: matchingSkills.length > 0 ? matchingSkills : ['Communication'],
            missingSkills,

            matchingKeywords: matchingKeywords.length > 0 ? matchingKeywords : ['Development'],
            missingKeywords,

            recommendations,
            summary
        },

        metadata: {
            resumeWordCount: resumeAnalysis.metadata?.wordCount || 300,
            jobDescriptionWordCount: wordCount,
            analyzedAt: new Date().toISOString()
        }
    };
}

module.exports = {
    compareResumeToJobDescription,
    isSkillMatch
};
