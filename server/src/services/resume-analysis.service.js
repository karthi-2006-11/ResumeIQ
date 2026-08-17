const {
    extractStructuredResume,
    calculateVersion2Scores,
    generatePrioritizedRecommendations,
    SKILL_DICTIONARY
} = require('./resume-intelligence.service');

const { generateImprovementPlan } = require('./resume-improvement.service');

// Target Role Skill Requirements Map
const ROLE_REQUIRED_SKILLS = {
    'Software Engineer': ['JavaScript', 'Python', 'Java', 'Git', 'SQL', 'REST APIs', 'Docker', 'CI/CD'],
    'Frontend Developer': ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Git'],
    'Backend Engineer': ['Node.js', 'Express.js', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'REST APIs', 'Docker'],
    'Data Analyst': ['Python', 'SQL', 'Pandas', 'NumPy', 'Data Analysis', 'PostgreSQL'],
    'Product Manager': ['Agile', 'Jira', 'Data Analysis']
};

/**
 * Master Server-Side Resume Analysis Function (Version 2.0 Engine + Phase 18 Improvements)
 */
function analyzeResume(rawText, pageCount = 1, fileName = 'Resume.pdf', fileSize = '240 KB', targetRole = 'Software Engineer') {
    // 1. Run Structured Resume Extraction
    const structured = extractStructuredResume(rawText, pageCount);

    // 2. Compute Version 2.0 Scores & Recommendations
    const scores = calculateVersion2Scores(structured, targetRole);
    const recommendations = generatePrioritizedRecommendations(structured, targetRole);

    // 3. Determine Missing Required Skills for Target Role
    const requiredForRole = ROLE_REQUIRED_SKILLS[targetRole] || ROLE_REQUIRED_SKILLS['Software Engineer'];
    const skillsMissing = requiredForRole.filter(reqSkill => !structured.skillsFound.includes(reqSkill));

    // 4. Generate Phase 18 Improvement Plan (Strengths, Priority Issues, Action Plan, Safe Rewrites)
    const improvements = generateImprovementPlan(structured, targetRole, null);

    // 5. Format Executive Summary
    let summary = `Your resume has been processed with ResumeIQ Engine v2.0. `;
    if (structured.scannedPdfLikely) {
        summary += `WARNING: Scanned image content detected. Text readability is low.`;
    } else if (scores.atsScore >= 80) {
        summary += `Excellent ATS compatibility with strong skill coverage for ${targetRole}.`;
    } else if (scores.atsScore >= 60) {
        summary += `Good foundation for ${targetRole}, but adding quantified bullet metrics and missing skills will boost your ATS score.`;
    } else {
        summary += `Needs improvement. Missing core skills and structural sections for a competitive ${targetRole} application.`;
    }

    // 6. Build Backward-Compatible & Version 2.0 Extended Result Payload
    return {
        version: '2.0',
        mode: 'backend',
        fileName: fileName || 'Resume.pdf',
        fileSize: fileSize || '240 KB',
        targetRole: targetRole || 'Software Engineer',
        hasExtractedText: !structured.scannedPdfLikely && structured.metadata.characterCount > 50,
        isDemo: false,
        scannedPdfLikely: structured.scannedPdfLikely,
        scores,
        contactInfo: structured.contact,
        sectionsFound: structured.sections,
        skillsFound: structured.skillsFound,
        skillCategories: structured.skillCategories,
        skillsMissing,
        experienceStats: structured.experienceStats,
        improvements,
        suggestions: recommendations,
        summary,
        metadata: structured.metadata
    };
}

module.exports = {
    analyzeResume
};
