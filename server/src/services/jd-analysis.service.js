const { detectSkills } = require('../analyzers/skill.analyzer');

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o',
    're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn',
    'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn',
    'weren', 'won', 'wouldn', 'job', 'description', 'role', 'team', 'work', 'working',
    'candidate', 'ability', 'experience', 'qualifications', 'requirements', 'responsibilities'
]);

/**
 * Normalizes Job Description Text
 */
function normalizeJdText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Detects Common Sections in Job Descriptions
 */
function detectJdSections(text) {
    const sections = [];
    if (/responsibilities|duties|what you will do|key tasks/i.test(text)) sections.push('Responsibilities');
    if (/requirements|qualifications|what we look for|must have|skills required/i.test(text)) sections.push('Requirements');
    if (/preferred|nice to have|bonus|pluses|desirable/i.test(text)) sections.push('Preferred Skills');
    if (/about (us|the role|the company)|overview|who we are/i.test(text)) sections.push('About the Role');
    if (/education|degree|experience|years/i.test(text)) sections.push('Experience & Education');
    return sections;
}

/**
 * Separates Skills into Required vs Preferred
 */
function extractJdSkills(text) {
    const allSkills = detectSkills(text);
    const requiredSkills = [];
    const preferredSkills = [];

    // Split JD lines/paragraphs to check context
    const paragraphs = text.split(/[\r\n.]+/);

    for (const skill of allSkills) {
        const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        let isPreferred = false;

        for (const para of paragraphs) {
            if (skillRegex.test(para)) {
                if (/preferred|nice to have|bonus|plus|desirable|optional/i.test(para)) {
                    isPreferred = true;
                    break;
                }
            }
        }

        if (isPreferred) {
            preferredSkills.push(skill);
        } else {
            requiredSkills.push(skill);
        }
    }

    // Fallback: If no preferred section detected, assign top skills as required
    return {
        allSkills,
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : allSkills,
        preferredSkills
    };
}

/**
 * Extracts Meaningful Keywords & Phrase Signals from Job Description
 */
function extractJdKeywords(text) {
    const keywords = [];
    const lower = text.toLowerCase();

    // 1. Methodologies & Practices
    if (/\bagile\b/i.test(lower)) keywords.push('Agile Methodology');
    if (/\bscrum\b/i.test(lower)) keywords.push('Scrum');
    if (/\bci\/cd\b|\bcontinuous integration\b/i.test(lower)) keywords.push('CI/CD Pipelines');
    if (/\btest(-|\s)?driven\b|\btdd\b/i.test(lower)) keywords.push('TDD / Unit Testing');
    if (/\bresponsive (design|web)\b/i.test(lower)) keywords.push('Responsive Web Design');

    // 2. Key Responsibilities & Tasks
    if (/\bapi (development|design|integration)\b/i.test(lower)) keywords.push('API Development');
    if (/\bdatabase (design|architecture|management)\b/i.test(lower)) keywords.push('Database Management');
    if (/\bcode review(s)?\b/i.test(lower)) keywords.push('Code Reviews');
    if (/\bcloud (deployment|infrastructure|services)\b/i.test(lower)) keywords.push('Cloud Infrastructure');
    if (/\bperformance optimization\b/i.test(lower)) keywords.push('Performance Optimization');

    // 3. Soft Skills & Leadership
    if (/\bcommunication\b/i.test(lower)) keywords.push('Cross-functional Communication');
    if (/\bproblem solving\b/i.test(lower)) keywords.push('Problem Solving');
    if (/\bmentorship\b|\bmentoring\b/i.test(lower)) keywords.push('Mentorship');
    if (/\bleadership\b/i.test(lower)) keywords.push('Technical Leadership');

    // 4. Token-based word frequency extraction
    const words = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
    const wordCounts = {};

    for (const word of words) {
        if (word.length >= 4 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
    }

    const sortedTokens = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Combine and deduplicate
    const combined = [...new Set([...keywords, ...sortedTokens])];
    return combined.slice(0, 8);
}

module.exports = {
    normalizeJdText,
    detectJdSections,
    extractJdSkills,
    extractJdKeywords
};
