/**
 * Server-Side Suggestion & Summary Generator
 */

function generateSuggestions(contactInfo, foundSections, missingSkills, targetRole, text) {
    const suggestions = [];

    // 1. Contact links
    if (!contactInfo.hasGithub && (targetRole.includes('Software') || targetRole.includes('Developer') || targetRole.includes('Backend'))) {
        suggestions.push({
            title: 'Add GitHub Profile Link',
            desc: 'Include a clickable link to your GitHub profile to highlight your technical repositories and code contributions.'
        });
    }
    if (!contactInfo.hasLinkedin) {
        suggestions.push({
            title: 'Include LinkedIn URL',
            desc: 'Add your custom LinkedIn profile link in the header contact section for easy recruiter verification.'
        });
    }

    // 2. Sections
    if (!foundSections.includes('projects')) {
        suggestions.push({
            title: 'Add a Dedicated Projects Section',
            desc: 'Demonstrate practical application by listing 2-3 key technical projects with technologies used and links.'
        });
    }
    if (!foundSections.includes('summary')) {
        suggestions.push({
            title: 'Include Professional Summary',
            desc: 'Add a 2-3 sentence overview at the top summarizing your core qualifications and career target.'
        });
    }

    // 3. Missing skills
    if (missingSkills.length > 0) {
        const topMissing = missingSkills.slice(0, 3).join(', ');
        suggestions.push({
            title: `Incorporate Target Role Keywords (${targetRole})`,
            desc: `Consider adding experience or projects featuring key missing terms: ${topMissing}.`
        });
    }

    // 4. Quantified accomplishments
    if (!/\d+%|\$\d+|\d+\+?\s*(users|clients|projects|ms|sec)/i.test(text)) {
        suggestions.push({
            title: 'Quantify Achievements & Impact',
            desc: 'Include measurable metrics in your experience bullets (e.g. "Reduced load time by 30%" or "Served 5,000+ users").'
        });
    }

    return suggestions.slice(0, 4);
}

function generateSummary(targetRole, foundSections, foundSkills, missingSkills, atsScore) {
    const sectionsStr = foundSections.length > 0
        ? foundSections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
        : 'standard resume sections';

    const matchStatus = atsScore >= 80
        ? 'high compatibility'
        : atsScore >= 65
            ? 'moderate compatibility'
            : 'opportunities for keyword optimization';

    let summary = `Server analysis: Your resume displays ${matchStatus} for the ${targetRole} position. `;
    summary += `Identified sections include ${sectionsStr}. `;

    if (foundSkills.length > 0) {
        summary += `Detected key technical skills such as ${foundSkills.slice(0, 4).join(', ')}. `;
    }
    if (missingSkills.length > 0) {
        summary += `To increase your ATS score further, consider integrating targeted keywords like ${missingSkills.slice(0, 3).join(', ')}.`;
    }

    return summary;
}

module.exports = {
    generateSuggestions,
    generateSummary
};
