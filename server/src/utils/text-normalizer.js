/**
 * Server-Side Text Normalizer & Contact Info Extractor
 */

function normalizeText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
}

function extractContactInfo(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
    const linkedinRegex = /(linkedin\.com\/in\/[A-Za-z0-9_-]+)/i;
    const githubRegex = /(github\.com\/[A-Za-z0-9_-]+)/i;

    const emailMatch = text.match(emailRegex);
    const phoneMatch = text.match(phoneRegex);
    const linkedinMatch = text.match(linkedinRegex);
    const githubMatch = text.match(githubRegex);

    return {
        hasEmail: !!emailMatch,
        email: emailMatch ? emailMatch[0] : null,
        hasPhone: !!phoneMatch,
        phone: phoneMatch ? phoneMatch[0] : null,
        hasLinkedin: !!linkedinMatch,
        linkedin: linkedinMatch ? linkedinMatch[0] : null,
        hasGithub: !!githubMatch,
        github: githubMatch ? githubMatch[0] : null
    };
}

module.exports = {
    normalizeText,
    extractContactInfo
};
