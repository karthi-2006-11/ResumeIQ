/**
 * ResumeIQ — Client-Side Resume Improvement Assistant Engine (v18.0)
 * Pure Deterministic Rules for Strengths, Priority Issues, Action Plans,
 * and Safe Non-Fabricating Rewrite Suggestions for Browser/Offline Use.
 *
 * NON-FABRICATION RULE: Never invent metrics, company names, job titles,
 * technologies, dates, or team sizes not present in source input data.
 */

const ResumeIQImprovement = (() => {

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

    function detectStrengths(analysis, jobMatch = null) {
        const strengths = [];

        if (analysis.contactInfo && analysis.contactInfo.hasEmail && analysis.contactInfo.hasPhone) {
            strengths.push({
                id: 'strength-contact-complete',
                title: 'Complete Contact Information',
                description: 'Header includes essential candidate contact details.',
                evidence: [analysis.contactInfo.email, analysis.contactInfo.phone].filter(Boolean).join(' | ')
            });
        }

        if (analysis.skillsFound && analysis.skillsFound.length >= 5) {
            strengths.push({
                id: 'strength-skills-coverage',
                title: 'Strong Technical Skill Coverage',
                description: `Identified ${analysis.skillsFound.length} canonical technical skills matching target expectations.`,
                evidence: analysis.skillsFound.slice(0, 5).join(', ')
            });
        }

        if (analysis.sectionsFound && analysis.sectionsFound.length >= 3) {
            strengths.push({
                id: 'strength-section-completeness',
                title: 'Well-Structured Resume Sections',
                description: 'Delineates core sections cleanly.',
                evidence: analysis.sectionsFound.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
            });
        }

        if (jobMatch && jobMatch.matchScore >= 70) {
            strengths.push({
                id: 'strength-job-match',
                title: 'Strong Target Job Alignment',
                description: `Matches ${jobMatch.matchScore}% of target job posting signals.`,
                evidence: `Matched ${jobMatch.matchingSkills?.length || 0} skills.`
            });
        }

        return strengths;
    }

    function detectIssues(analysis, targetRole = 'Software Engineer', jobMatch = null) {
        const issues = [];

        if (analysis.scannedPdfLikely) {
            issues.push({
                id: 'issue-scanned-pdf',
                category: 'Formatting',
                priority: 'high',
                title: 'Scanned / Low-Text PDF File',
                evidence: 'Text parser extracted minimal text.',
                recommendation: 'Save document directly as a text PDF from MS Word or Google Docs.',
                affectedSection: 'formatting'
            });
        }

        if (jobMatch && jobMatch.missingSkills && jobMatch.missingSkills.length > 0) {
            issues.push({
                id: 'issue-job-match-required-missing',
                category: 'Job Match',
                priority: 'high',
                title: `Missing Target Job Skills (${jobMatch.missingSkills.slice(0, 2).join(', ')})`,
                evidence: `Job description specifies ${jobMatch.missingSkills.join(', ')}.`,
                recommendation: `If you possess experience with ${jobMatch.missingSkills.slice(0, 2).join(' or ')}, add them to your Skills and Project sections.`,
                affectedSection: 'skills'
            });
        }

        if (analysis.sectionsFound && !analysis.sectionsFound.includes('skills')) {
            issues.push({
                id: 'issue-missing-skills-section',
                category: 'Sections',
                priority: 'high',
                title: 'Missing Dedicated Skills Section',
                evidence: 'No dedicated skills heading detected.',
                recommendation: 'Add a distinct "Technical Skills" section heading.',
                affectedSection: 'skills'
            });
        }

        if (analysis.contactInfo && !analysis.contactInfo.hasEmail) {
            issues.push({
                id: 'issue-missing-email',
                category: 'Contact',
                priority: 'high',
                title: 'Missing Email Address',
                evidence: 'No email address detected.',
                recommendation: 'Place a professional email address in the header.',
                affectedSection: 'contact'
            });
        }

        if (analysis.experienceStats && analysis.experienceStats.quantificationCount === 0) {
            issues.push({
                id: 'issue-no-quantification',
                category: 'Quantification',
                priority: 'medium',
                title: 'Add Measurable Outcomes & Metrics',
                evidence: '0 bullet points contain measurable metrics (%, $, user counts).',
                recommendation: 'If you have measurable results (e.g. latency reduction %, user volume), include them in your bullet points.',
                affectedSection: 'experience'
            });
        }

        if (analysis.experienceStats && analysis.experienceStats.passivePhrasesCount > 0) {
            issues.push({
                id: 'issue-passive-bullets',
                category: 'Bullet Quality',
                priority: 'medium',
                title: 'Replace Passive Language with Active Verbs',
                evidence: `Detected ${analysis.experienceStats.passivePhrasesCount} passive phrasing instances.`,
                recommendation: 'Replace passive phrases like "responsible for" with active verbs like "Engineered" or "Optimized".',
                affectedSection: 'experience'
            });
        }

        return issues;
    }

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

    function generateSafeRewriteSuggestions(analysis) {
        const suggestions = [];

        // Passive phrase rewrites
        if (analysis.summary && /\bresponsible for\b/i.test(analysis.summary)) {
            suggestions.push({
                id: 'rewrite-summary-passive',
                section: 'summary',
                original: analysis.summary,
                suggestion: analysis.summary.replace(/\bresponsible for\b/gi, 'Specialized in'),
                reason: 'Replaces passive phrasing with active verb.',
                confidence: 'high'
            });
        }

        // Summary guidance using only known skills
        if (analysis.skillsFound && analysis.skillsFound.length > 0) {
            const skillsSnippet = analysis.skillsFound.slice(0, 4).join(', ');
            suggestions.push({
                id: 'rewrite-summary-guidance',
                section: 'summary',
                original: 'Generic Summary',
                suggestion: `Results-driven software professional proficient in ${skillsSnippet}. Experienced in building applications and collaborating in fast-paced engineering teams.`,
                reason: 'Refreshes summary structure using ONLY skills explicitly detected in your resume context.',
                confidence: 'medium'
            });
        }

        return suggestions;
    }

    function generateImprovementPlan(analysis, targetRole = 'Software Engineer', jobMatch = null) {
        const strengths = detectStrengths(analysis, jobMatch);
        const issues = detectIssues(analysis, targetRole, jobMatch);
        const actionPlan = buildActionPlan(issues);
        const rewriteSuggestions = generateSafeRewriteSuggestions(analysis);

        const hasHighPriority = issues.some(i => i.priority === 'high');
        const overallPriority = hasHighPriority ? 'high' : (issues.length > 0 ? 'medium' : 'low');

        return {
            version: '1.0',
            engineVersion: '18.0',
            overallPriority,
            summary: `ResumeIQ Improvement Engine v18.0: Identified ${strengths.length} key strengths and ${issues.length} action items.`,
            strengths,
            issues,
            actionPlan,
            rewriteSuggestions
        };
    }

    return {
        generateImprovementPlan,
        detectStrengths,
        detectIssues,
        buildActionPlan,
        generateSafeRewriteSuggestions
    };
})();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.ResumeIQImprovement = ResumeIQImprovement;
}
