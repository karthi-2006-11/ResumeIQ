/**
 * Server-Side Resume Section Analyzer
 */

const SECTION_PATTERNS = {
    contact: /(contact|personal info|address|phone|email)/i,
    summary: /(summary|profile|objective|about me|overview|statement)/i,
    experience: /(work experience|experience|employment|history|work history|career)/i,
    education: /(education|academic|qualification|university|college|degree)/i,
    skills: /(skills|technical skills|technologies|competencies|expertise|tools)/i,
    projects: /(projects|personal projects|key projects|portfolio)/i,
    certifications: /(certifications|licenses|courses|credentials|certificates)/i,
    achievements: /(achievements|awards|honors|accomplishments)/i
};

function detectSections(text) {
    const foundSections = [];
    const lines = text.split(/[\r\n]+/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 3 && trimmed.length < 35) {
            for (const [sectionKey, pattern] of Object.entries(SECTION_PATTERNS)) {
                if (pattern.test(trimmed) && !foundSections.includes(sectionKey)) {
                    foundSections.push(sectionKey);
                }
            }
        }
    }

    // Fallback checks across full text
    if (!foundSections.includes('skills') && /(skills|technologies)/i.test(text)) foundSections.push('skills');
    if (!foundSections.includes('experience') && /(experience|employment|worked at)/i.test(text)) foundSections.push('experience');
    if (!foundSections.includes('education') && /(education|degree|bachelor|master|university)/i.test(text)) foundSections.push('education');
    if (!foundSections.includes('projects') && /(projects|project)/i.test(text)) foundSections.push('projects');
    if (!foundSections.includes('summary') && /(summary|profile)/i.test(text)) foundSections.push('summary');

    return foundSections;
}

module.exports = {
    detectSections
};
