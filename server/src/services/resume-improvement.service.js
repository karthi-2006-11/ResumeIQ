/**
 * ResumeIQ — Version 18.0 Resume Improvement Assistant Engine
 * Pure Deterministic Rules for Strengths, Priority Issues, Action Plans,
 * and Safe Non-Fabricating Rewrite Suggestions.
 *
 * NON-FABRICATION RULE: Never invent metrics, company names, job titles,
 * technologies, dates, or team sizes not present in source input data.
 */

const SAFE_PASSIVE_REWRITES = [
    { pattern: /\bresponsible for managing\b/i, replace: 'Managed', reason: 'Replaces passive phrasing with active verb without changing scope.' },
    { pattern: /\bresponsible for building\b/i, replace: 'Built', reason: 'Replaces passive phrasing with active verb.' },
    { pattern: /\bresponsible for developing\b/i, replace: 'Developed', reason: 'Replaces passive phrasing with active verb.' },
    { pattern: /\bresponsible for maintaining\b/i, replace: 'Maintained', reason: 'Replaces passive phrasing with active verb.' },
    { pattern: /\bresponsible for\b/i, replace: 'Handled', reason: 'Replaces passive phrasing with active verb.' },
    { pattern: /\bworked on building\b/i, replace: 'Built', reason: 'Replaces informal "worked on" with active verb.' },
    { pattern: /\bworked on developing\b/i, replace: 'Developed', reason: 'Replaces informal "worked on" with active verb.' },
    { pattern: /\bworked on\b/i, replace: 'Contributed to', reason: 'Replaces informal phrase with professional active verb.' },
    { pattern: /\bhelped with\b/i, replace: 'Assisted in', reason: 'Replaces informal phrasing.' },
    { pattern: /\binvolved in\b/i, replace: 'Participated in', reason: 'Replaces passive phrasing.' }
];

/**
 * Safely extracts contact object from structured or analysis payload
 */
function getContact(structured) {
    if (!structured) return {};
    return structured.contact || structured.contactInfo || {};
}

/**
 * Safely extracts sections list
 */
function getSections(structured) {
    if (!structured) return [];
    return structured.sections || structured.sectionsFound || [];
}

/**
 * Detects Strengths based on Resume Intelligence signals
 */
function detectStrengths(structured, jobMatch = null) {
    const strengths = [];
    const contact = getContact(structured);
    const sections = getSections(structured);
    const skills = structured.skillsFound || [];

    // 1. Contact Completeness Strength
    if (contact.hasEmail && contact.hasPhone && (contact.hasLinkedin || contact.hasGithub)) {
        strengths.push({
            id: 'strength-contact-complete',
            title: 'Complete Contact Information',
            description: 'Your header contains all essential contact channels (Email, Phone, and Professional Profile Link).',
            evidence: [contact.email, contact.phone, contact.linkedin || contact.github].filter(Boolean).join(' | ')
        });
    }

    // 2. Skill Coverage Strength
    if (skills.length >= 6) {
        strengths.push({
            id: 'strength-skills-coverage',
            title: 'Strong Technical Skill Coverage',
            description: `Identified ${skills.length} canonical technical skills matching industry standards.`,
            evidence: skills.slice(0, 6).join(', ')
        });
    }

    // 3. Section Completeness Strength
    if (sections.length >= 4) {
        strengths.push({
            id: 'strength-section-completeness',
            title: 'Well-Structured Resume Sections',
            description: 'Your resume cleanly delineates key core sections.',
            evidence: sections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
        });
    }

    // 4. Quantified Achievements Strength
    const expStats = structured.experienceStats || {};
    if (expStats.quantificationCount >= 2) {
        strengths.push({
            id: 'strength-quantification',
            title: 'Measurable Outcomes & Metrics',
            description: `Found ${expStats.quantificationCount} bullet points with quantifiable data metrics.`,
            evidence: `${expStats.quantificationCount} quantified bullet points detected.`
        });
    }

    // 5. Strong Job Match Alignment
    if (jobMatch && jobMatch.matchScore >= 75) {
        strengths.push({
            id: 'strength-job-match',
            title: 'High Target Job Alignment',
            description: `Resume aligns with ${jobMatch.matchScore}% of target job requirements.`,
            evidence: `Matched ${jobMatch.matchingSkills?.length || 0} skills from job posting.`
        });
    }

    return strengths;
}

/**
 * Detects Prioritized Issues (High / Medium / Low)
 */
function detectIssues(structured, targetRole = 'Software Engineer', jobMatch = null) {
    const issues = [];
    const contact = getContact(structured);
    const sections = getSections(structured);

    // 1. Scanned PDF Issue (HIGH)
    if (structured.scannedPdfLikely) {
        issues.push({
            id: 'issue-scanned-pdf',
            category: 'Formatting',
            priority: 'high',
            title: 'Scanned / Low-Text PDF File',
            evidence: 'Parser extracted fewer than 50 characters of selectable text.',
            recommendation: 'Save your resume directly as a text PDF from MS Word, Google Docs, or LaTeX rather than scanning a physical document.',
            affectedSection: 'formatting'
        });
    }

    // 2. Missing Job Match Required Skills (HIGH)
    if (jobMatch && jobMatch.missingSkills && jobMatch.missingSkills.length > 0) {
        issues.push({
            id: 'issue-job-match-required-missing',
            category: 'Job Match',
            priority: 'high',
            title: `Missing Target Job Skills (${jobMatch.missingSkills.slice(0, 2).join(', ')})`,
            evidence: `Target job posting requires ${jobMatch.missingSkills.join(', ')}.`,
            recommendation: `If you have hands-on experience with ${jobMatch.missingSkills.slice(0, 2).join(' or ')}, explicitly list them in your Skills and Experience sections.`,
            affectedSection: 'skills'
        });
    }

    // 3. Missing Core Section (HIGH)
    if (!sections.includes('skills')) {
        issues.push({
            id: 'issue-missing-skills-section',
            category: 'Sections',
            priority: 'high',
            title: 'Missing Dedicated Skills Section',
            evidence: 'No dedicated "Skills" or "Technical Expertise" heading detected.',
            recommendation: 'Add a distinct "Technical Skills" section near the top of your resume.',
            affectedSection: 'skills'
        });
    }

    // 4. Missing Email (HIGH)
    if (!contact.hasEmail) {
        issues.push({
            id: 'issue-missing-email',
            category: 'Contact',
            priority: 'high',
            title: 'Missing Email Address',
            evidence: 'No standard email address detected in candidate contact header.',
            recommendation: 'Place your professional email address prominently in the top header.',
            affectedSection: 'contact'
        });
    }

    const expStats = structured.experienceStats || {};

    // 5. Lack of Quantification (MEDIUM)
    if (expStats.quantificationCount === 0) {
        issues.push({
            id: 'issue-no-quantification',
            category: 'Quantification',
            priority: 'medium',
            title: 'Add Measurable Outcomes & Metrics',
            evidence: '0 bullet points contain measurable metrics (percentages, dollar amounts, user counts).',
            recommendation: 'If you have measurable results (e.g. latency reduction %, user volume, project counts), include them in your experience bullets.',
            affectedSection: 'experience'
        });
    }

    // 6. Passive Language Bullets (MEDIUM)
    if (expStats.passivePhrasesCount > 0) {
        issues.push({
            id: 'issue-passive-bullets',
            category: 'Bullet Quality',
            priority: 'medium',
            title: 'Replace Passive Language with Active Verbs',
            evidence: `Detected ${expStats.passivePhrasesCount} passive phrasing instances (e.g., "responsible for", "worked on").`,
            recommendation: 'Replace passive phrases with active verbs like "Engineered", "Optimized", or "Delivered".',
            affectedSection: 'experience'
        });
    }

    // 7. Missing Professional Profile Links (LOW)
    if (!contact.hasLinkedin && !contact.hasGithub) {
        issues.push({
            id: 'issue-missing-social-links',
            category: 'Contact',
            priority: 'low',
            title: 'Add Professional Social Profile Links',
            evidence: 'Neither LinkedIn nor GitHub profile URL detected in contact header.',
            recommendation: 'Add your LinkedIn or GitHub profile URL to increase trust.',
            affectedSection: 'contact'
        });
    }

    return issues;
}

/**
 * Builds Action Plan based on prioritized issues
 */
function buildActionPlan(issues) {
    if (!issues || issues.length === 0) {
        return ['Your resume meets key structural guidelines. Review job-specific keyword alignment before applying.'];
    }

    const sorted = [...issues].sort((a, b) => {
        const order = { high: 1, medium: 2, low: 3 };
        return (order[a.priority] || 4) - (order[b.priority] || 4);
    });

    return sorted.map((issue, idx) => `${idx + 1}. ${issue.title} — ${issue.recommendation}`);
}

/**
 * Generates Safe Non-Fabricating Rewrite Suggestions
 */
function generateSafeRewriteSuggestions(structured) {
    const suggestions = [];
    const bullets = structured.bullets || (structured.experienceStats ? structured.experienceStats.bullets : []) || [];

    for (let i = 0; i < Math.min(5, bullets.length); i++) {
        const item = bullets[i];
        const text = typeof item === 'string' ? item : item.text;
        if (!text) continue;

        for (const rule of SAFE_PASSIVE_REWRITES) {
            if (rule.pattern.test(text)) {
                const suggestedText = text.replace(rule.pattern, rule.replace);
                suggestions.push({
                    id: `rewrite-bullet-${i}`,
                    section: 'experience',
                    original: text,
                    suggestion: suggestedText,
                    reason: rule.reason,
                    confidence: 'high'
                });
                break;
            }
        }
    }

    const sections = getSections(structured);
    const skills = structured.skillsFound || [];

    if (sections.includes('summary') && skills.length > 0) {
        const skillsSnippet = skills.slice(0, 4).join(', ');
        suggestions.push({
            id: 'rewrite-summary-guidance',
            section: 'summary',
            original: 'Professional Summary',
            suggestion: `Results-driven software professional proficient in ${skillsSnippet}. Experienced in building scalable applications and collaborating in fast-paced engineering teams.`,
            reason: 'Refreshes summary structure using ONLY skills explicitly detected in your resume context.',
            confidence: 'medium'
        });
    }

    return suggestions;
}

/**
 * Master Resume Improvement Engine Entry Point
 */
function generateImprovementPlan(structuredResume, targetRole = 'Software Engineer', jobMatch = null) {
    const structured = structuredResume || {};
    const strengths = detectStrengths(structured, jobMatch);
    const issues = detectIssues(structured, targetRole, jobMatch);
    const actionPlan = buildActionPlan(issues);
    const rewriteSuggestions = generateSafeRewriteSuggestions(structured);

    const hasHighPriority = issues.some(i => i.priority === 'high');
    const overallPriority = hasHighPriority ? 'high' : (issues.length > 0 ? 'medium' : 'low');

    let summary = `ResumeIQ Improvement Engine v18.0: Identified ${strengths.length} key strengths and ${issues.length} action items.`;
    if (hasHighPriority) {
        summary += ` Focus on high-priority items first for maximum ATS score impact.`;
    }

    return {
        version: '1.0',
        engineVersion: '18.0',
        overallPriority,
        summary,
        strengths,
        issues,
        actionPlan,
        rewriteSuggestions
    };
}

module.exports = {
    generateImprovementPlan,
    detectStrengths,
    detectIssues,
    buildActionPlan,
    generateSafeRewriteSuggestions,
    SAFE_PASSIVE_REWRITES
};
