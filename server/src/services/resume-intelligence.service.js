/**
 * ResumeIQ — Version 2.0 Advanced Resume Intelligence Engine
 * Pure Deterministic Heuristic Extraction, Section Boundary Parsing, Skill Normalization,
 * Bullet Quality Analysis, Quantification Detection, and Prioritized Recommendations.
 *
 * Privacy Rule: DO NOT STORE RAW TEXT OR PDF BUFFERS IN DATABASE.
 */

// 1. Master Alias Dictionary & Category Map
const SKILL_DICTIONARY = [
    // Programming Languages
    { name: 'JavaScript', category: 'Programming Languages', aliases: ['javascript', 'js', 'es6', 'ecmascript'] },
    { name: 'TypeScript', category: 'Programming Languages', aliases: ['typescript', 'ts'] },
    { name: 'Python', category: 'Programming Languages', aliases: ['python', 'py', 'python3'] },
    { name: 'Java', category: 'Programming Languages', aliases: ['java', 'jdk', 'j2ee'] },
    { name: 'C++', category: 'Programming Languages', aliases: ['c++', 'cpp'] },
    { name: 'C#', category: 'Programming Languages', aliases: ['c#', 'csharp', '.net'] },
    { name: 'C', category: 'Programming Languages', aliases: ['c'] },
    { name: 'Go', category: 'Programming Languages', aliases: ['golang', 'go'] },
    { name: 'Rust', category: 'Programming Languages', aliases: ['rust'] },
    { name: 'PHP', category: 'Programming Languages', aliases: ['php'] },
    { name: 'Ruby', category: 'Programming Languages', aliases: ['ruby'] },
    { name: 'SQL', category: 'Programming Languages', aliases: ['sql', 't-sql', 'pl/sql'] },

    // Frontend
    { name: 'HTML5', category: 'Frontend', aliases: ['html', 'html5'] },
    { name: 'CSS3', category: 'Frontend', aliases: ['css', 'css3', 'scss', 'sass', 'less'] },
    { name: 'React', category: 'Frontend', aliases: ['react', 'react.js', 'reactjs'] },
    { name: 'Next.js', category: 'Frontend', aliases: ['next.js', 'nextjs', 'next'] },
    { name: 'Vue.js', category: 'Frontend', aliases: ['vue', 'vue.js', 'vuejs'] },
    { name: 'Angular', category: 'Frontend', aliases: ['angular', 'angularjs', 'angular.js'] },
    { name: 'Tailwind CSS', category: 'Frontend', aliases: ['tailwind', 'tailwindcss'] },
    { name: 'Bootstrap', category: 'Frontend', aliases: ['bootstrap', 'bootstrap4', 'bootstrap5'] },
    { name: 'Redux', category: 'Frontend', aliases: ['redux', 'redux toolkit'] },

    // Backend & Frameworks
    { name: 'Node.js', category: 'Backend', aliases: ['node.js', 'nodejs', 'node'] },
    { name: 'Express.js', category: 'Backend', aliases: ['express', 'express.js', 'expressjs'] },
    { name: 'Django', category: 'Backend', aliases: ['django'] },
    { name: 'Flask', category: 'Backend', aliases: ['flask'] },
    { name: 'Spring Boot', category: 'Backend', aliases: ['spring', 'spring boot', 'springboot'] },
    { name: 'FastAPI', category: 'Backend', aliases: ['fastapi'] },
    { name: 'GraphQL', category: 'Backend', aliases: ['graphql'] },
    { name: 'REST APIs', category: 'Backend', aliases: ['rest api', 'rest apis', 'restful', 'restful apis'] },

    // Databases
    { name: 'MongoDB', category: 'Databases', aliases: ['mongodb', 'mongo', 'mongoose'] },
    { name: 'PostgreSQL', category: 'Databases', aliases: ['postgresql', 'postgres', 'psql'] },
    { name: 'MySQL', category: 'Databases', aliases: ['mysql'] },
    { name: 'Redis', category: 'Databases', aliases: ['redis'] },
    { name: 'SQLite', category: 'Databases', aliases: ['sqlite'] },
    { name: 'Firebase', category: 'Databases', aliases: ['firebase', 'firestore'] },

    // Cloud & DevOps
    { name: 'AWS', category: 'Cloud & DevOps', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
    { name: 'Docker', category: 'Cloud & DevOps', aliases: ['docker', 'containerization'] },
    { name: 'Kubernetes', category: 'Cloud & DevOps', aliases: ['kubernetes', 'k8s'] },
    { name: 'Git', category: 'Cloud & DevOps', aliases: ['git', 'github', 'gitlab', 'version control'] },
    { name: 'CI/CD', category: 'Cloud & DevOps', aliases: ['ci/cd', 'cicd', 'github actions', 'jenkins'] },
    { name: 'Google Cloud', category: 'Cloud & DevOps', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
    { name: 'Azure', category: 'Cloud & DevOps', aliases: ['azure', 'microsoft azure'] },

    // Data & AI
    { name: 'Pandas', category: 'Data & AI', aliases: ['pandas'] },
    { name: 'NumPy', category: 'Data & AI', aliases: ['numpy'] },
    { name: 'Scikit-Learn', category: 'Data & AI', aliases: ['scikit-learn', 'sklearn'] },
    { name: 'TensorFlow', category: 'Data & AI', aliases: ['tensorflow', 'tf'] },
    { name: 'PyTorch', category: 'Data & AI', aliases: ['pytorch'] },
    { name: 'Machine Learning', category: 'Data & AI', aliases: ['machine learning', 'ml'] },
    { name: 'Data Analysis', category: 'Data & AI', aliases: ['data analysis', 'data analytics'] },

    // Tools & Methodologies
    { name: 'Jira', category: 'Tools & Methodologies', aliases: ['jira'] },
    { name: 'Agile', category: 'Tools & Methodologies', aliases: ['agile', 'scrum'] },
    { name: 'Unit Testing', category: 'Tools & Methodologies', aliases: ['unit testing', 'jest', 'mocha', 'junit', 'pytest'] }
];

// 2. Section Heading Normalization Map
const SECTION_HEADERS = {
    summary: ['summary', 'professional summary', 'career summary', 'profile', 'about me', 'executive summary', 'objective'],
    skills: ['skills', 'technical skills', 'core competencies', 'skills & expertise', 'tech stack', 'technical expertise', 'technologies'],
    experience: ['experience', 'work experience', 'professional experience', 'employment history', 'work history', 'career history'],
    education: ['education', 'academic background', 'academic history', 'qualifications', 'education & credentials'],
    projects: ['projects', 'key projects', 'personal projects', 'academic projects', 'featured projects'],
    certifications: ['certifications', 'licenses & certifications', 'certifications & licenses', 'professional certifications'],
    achievements: ['achievements', 'awards', 'honors', 'awards & achievements', 'recognition']
};

// 3. Action Verbs List
const ACTION_VERBS = [
    'built', 'developed', 'engineered', 'architected', 'designed', 'implemented', 'deployed',
    'optimized', 'automated', 'scaled', 'refactored', 'accelerated', 'improved', 'increased',
    'reduced', 'decreased', 'transformed', 'spearheaded', 'managed', 'led', 'mentored',
    'created', 'launched', 'delivered', 'integrated', 'streamlined', 'resolved'
];

// 4. Passive Language Detector Patterns
const PASSIVE_PATTERNS = [
    /\bresponsible for\b/i,
    /\bworked on\b/i,
    /\bhelped with\b/i,
    /\binvolved in\b/i,
    /\bwas responsible for\b/i,
    /\bassisted with\b/i,
    /\bparticipated in\b/i,
    /\btasked with\b/i
];

// 5. Quantification Metric Regex Patterns
const QUANTIFICATION_PATTERNS = [
    /\b\d+%/g,
    /\b\d+x\b/gi,
    /\b\$\d+(?:,\d{3})*(?:\.\d+)?(?:k|m|b)?\b/gi,
    /\b₹\d+(?:,\d{3})*(?:k|l|cr)?\b/gi,
    /\b\d+\+\s*(?:users|clients|customers|requests|downloads|stars|projects|members)\b/gi,
    /\b(?:increased|decreased|reduced|improved|boosted|saved)\s+[^.\n,]*?\b\d+/gi
];

/**
 * Extract Contact Info (Email, Phone, LinkedIn, GitHub, Name)
 */
function extractContactInfo(text) {
    if (!text || typeof text !== 'string') {
        return { hasEmail: false, email: null, hasPhone: false, phone: null, hasLinkedin: false, linkedin: null, hasGithub: false, github: null, name: null };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Email Regex
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : null;

    // Phone Regex (Supports Indian & International formats)
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    const phone = phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10 ? phoneMatch[0].trim() : null;

    // LinkedIn Regex
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
    const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : null;

    // GitHub Regex
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i);
    const github = githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : null;

    // Name Extraction Heuristic (Inspect top 5 lines)
    let extractedName = null;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (line.includes('@') || line.includes('http') || line.toLowerCase().includes('resume') || line.toLowerCase().includes('curriculum') || line.toLowerCase().includes('phone')) continue;
        if (/^[\w\s.-]{3,40}$/.test(line) && !/\d/.test(line) && line.trim().split(/\s+/).length <= 4) {
            extractedName = line.trim();
            break;
        }
    }

    return {
        hasEmail: !!email,
        email,
        hasPhone: !!phone,
        phone,
        hasLinkedin: !!linkedin,
        linkedin,
        hasGithub: !!github,
        github,
        name: extractedName
    };
}

/**
 * Extract Normalized Sections & Boundaries
 */
function extractSections(text) {
    if (!text || typeof text !== 'string') return { found: [], map: {} };

    const lines = text.split(/\r?\n/);
    const sectionMap = {};
    const foundSections = [];

    let currentSectionKey = 'header';
    sectionMap['header'] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase().replace(/[^a-z\s]/g, '');

        let matchedKey = null;
        for (const [key, headers] of Object.entries(SECTION_HEADERS)) {
            if (headers.includes(lower)) {
                matchedKey = key;
                break;
            }
        }

        if (matchedKey) {
            currentSectionKey = matchedKey;
            if (!foundSections.includes(matchedKey)) {
                foundSections.push(matchedKey);
            }
            if (!sectionMap[currentSectionKey]) {
                sectionMap[currentSectionKey] = [];
            }
        } else {
            if (!sectionMap[currentSectionKey]) sectionMap[currentSectionKey] = [];
            sectionMap[currentSectionKey].push(line);
        }
    }

    const formattedMap = {};
    for (const [k, v] of Object.entries(sectionMap)) {
        formattedMap[k] = v.join('\n').trim();
    }

    return {
        found: foundSections,
        map: formattedMap
    };
}

/**
 * Extract Normalized Skills, Categories, and Aliases with Strict Boundaries
 */
function extractSkills(text) {
    if (!text || typeof text !== 'string') return { canonicalList: [], categoryMap: {} };

    const canonicalSet = new Set();
    const categoryMap = {};

    for (const skill of SKILL_DICTIONARY) {
        let isMatch = false;

        for (const alias of skill.aliases) {
            const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let regex;
            if (alias === 'c') {
                regex = /(?:^|\s)C(?:$|\s|,|\.|\/)/g;
            } else if (alias === 'c++') {
                regex = /(?:^|\s|\b)c\+\+(?:$|\s|,|\.|\b)/gi;
            } else if (alias === 'c#') {
                regex = /(?:^|\s|\b)c#(?:$|\s|,|\.|\b)/gi;
            } else {
                regex = new RegExp(`\\b${escaped}\\b`, 'gi');
            }

            if (regex.test(text)) {
                isMatch = true;
                break;
            }
        }

        if (isMatch) {
            canonicalSet.add(skill.name);
            if (!categoryMap[skill.category]) {
                categoryMap[skill.category] = [];
            }
            if (!categoryMap[skill.category].includes(skill.name)) {
                categoryMap[skill.category].push(skill.name);
            }
        }
    }

    return {
        canonicalList: Array.from(canonicalSet),
        categoryMap
    };
}

/**
 * Extract Experience Bullets, Quantification Metrics, and Quality Signals
 */
function analyzeExperienceAndBullets(text) {
    if (!text || typeof text !== 'string') {
        return {
            bulletCount: 0,
            quantificationCount: 0,
            actionVerbsCount: 0,
            passivePhrasesCount: 0,
            duplicateBulletsCount: 0,
            strongBullets: 0,
            mediumBullets: 0,
            weakBullets: 0,
            bullets: []
        };
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bullets = [];
    const seenBullets = new Set();

    let quantificationCount = 0;
    let actionVerbsCount = 0;
    let passivePhrasesCount = 0;
    let duplicateBulletsCount = 0;
    let strongBullets = 0;
    let mediumBullets = 0;
    let weakBullets = 0;

    for (const line of lines) {
        const isBullet = /^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s*/.test(line) || ACTION_VERBS.some(v => line.toLowerCase().startsWith(v));
        if (!isBullet && line.length < 25) continue;

        const cleanLine = line.replace(/^[\u2022\u2023\u25E6\u2043\u2219\-\*]\s*/, '').trim();
        if (cleanLine.length < 15) continue;

        const lowerLine = cleanLine.toLowerCase();
        if (seenBullets.has(lowerLine)) {
            duplicateBulletsCount++;
        } else {
            seenBullets.add(lowerLine);
        }

        const firstWord = lowerLine.split(/\s+/)[0];
        const hasActionVerb = ACTION_VERBS.includes(firstWord);
        if (hasActionVerb) actionVerbsCount++;

        const hasPassive = PASSIVE_PATTERNS.some(p => p.test(cleanLine));
        if (hasPassive) passivePhrasesCount++;

        let hasMetric = false;
        for (const pattern of QUANTIFICATION_PATTERNS) {
            if (pattern.test(cleanLine)) {
                hasMetric = true;
                quantificationCount++;
                break;
            }
        }

        let quality = 'medium';
        if (hasActionVerb && hasMetric) {
            quality = 'strong';
            strongBullets++;
        } else if (hasPassive || cleanLine.length < 30) {
            quality = 'weak';
            weakBullets++;
        } else {
            mediumBullets++;
        }

        bullets.push({
            text: cleanLine,
            quality,
            hasActionVerb,
            hasMetric,
            hasPassive
        });
    }

    return {
        bulletCount: bullets.length,
        quantificationCount,
        actionVerbsCount,
        passivePhrasesCount,
        duplicateBulletsCount,
        strongBullets,
        mediumBullets,
        weakBullets,
        bullets
    };
}

/**
 * Master Structured Resume Extraction Function
 */
function extractStructuredResume(text, pageCount = 1) {
    const rawText = text || '';
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const characterCount = rawText.length;

    const scannedPdfLikely = characterCount < 50;

    const contact = extractContactInfo(rawText);
    const sections = extractSections(rawText);
    const skills = extractSkills(rawText);
    const expAnalysis = analyzeExperienceAndBullets(sections.map['experience'] || rawText);

    return {
        version: '2.0',
        scannedPdfLikely,
        contact,
        sections: sections.found,
        skillsFound: skills.canonicalList,
        skillCategories: skills.categoryMap,
        experienceStats: {
            bulletCount: expAnalysis.bulletCount,
            quantificationCount: expAnalysis.quantificationCount,
            actionVerbsCount: expAnalysis.actionVerbsCount,
            passivePhrasesCount: expAnalysis.passivePhrasesCount,
            duplicateBulletsCount: expAnalysis.duplicateBulletsCount,
            strongBullets: expAnalysis.strongBullets,
            mediumBullets: expAnalysis.mediumBullets,
            weakBullets: expAnalysis.weakBullets,
            bullets: expAnalysis.bullets
        },
        metadata: {
            wordCount,
            characterCount,
            pageCount: pageCount || 1,
            sectionCount: sections.found.length,
            bulletCount: expAnalysis.bulletCount,
            skillCount: skills.canonicalList.length
        }
    };
}

/**
 * Deterministic Version 2.0 Scoring Engine (100% Formula-Driven)
 */
function calculateVersion2Scores(structured, targetRole = 'Software Engineer') {
    if (structured.scannedPdfLikely) {
        return {
            atsScore: 15,
            skillsMatchPct: 10,
            qualityScore: 15,
            formattingScore: 20
        };
    }

    let contactScore = 0;
    if (structured.contact.hasEmail) contactScore += 40;
    if (structured.contact.hasPhone) contactScore += 30;
    if (structured.contact.hasLinkedin || structured.contact.hasGithub) contactScore += 30;

    const coreSections = ['skills', 'experience', 'education'];
    let sectionScore = 0;
    for (const sec of coreSections) {
        if (structured.sections.includes(sec)) sectionScore += 25;
    }
    if (structured.sections.includes('summary')) sectionScore += 12.5;
    if (structured.sections.includes('projects') || structured.sections.includes('certifications')) sectionScore += 12.5;

    const skillCount = structured.skillsFound.length;
    let skillsMatchPct = Math.min(100, Math.round((skillCount / 8) * 100));

    const { actionVerbsCount, quantificationCount, passivePhrasesCount, duplicateBulletsCount } = structured.experienceStats;

    let qualityScore = 60;
    if (actionVerbsCount > 3) qualityScore += 15;
    if (quantificationCount > 1) qualityScore += 15;
    if (passivePhrasesCount > 2) qualityScore -= 10;
    if (duplicateBulletsCount > 0) qualityScore -= 10;
    qualityScore = Math.min(100, Math.max(20, qualityScore));

    let formattingScore = 85;
    if (structured.metadata.wordCount < 150) formattingScore -= 20;
    if (structured.metadata.wordCount > 1200) formattingScore -= 15;
    if (structured.sections.length < 2) formattingScore -= 25;

    const atsScore = Math.min(100, Math.max(10, Math.round(
        (skillsMatchPct * 0.40) +
        (sectionScore * 0.25) +
        (qualityScore * 0.20) +
        (contactScore * 0.15)
    )));

    return {
        atsScore,
        skillsMatchPct,
        qualityScore,
        formattingScore
    };
}

/**
 * Generate Prioritized Actionable Recommendations
 */
function generatePrioritizedRecommendations(structured, targetRole) {
    const recs = [];

    if (structured.scannedPdfLikely) {
        recs.push({
            priority: 'high',
            title: 'Scanned / Low-Text PDF Detected',
            desc: 'Your PDF appears to contain image text or scanned content. Standard ATS scanners cannot read scanned text cleanly. Convert your resume to a text-selectable PDF.'
        });
    }

    if (!structured.contact.hasEmail) {
        recs.push({
            priority: 'high',
            title: 'Missing Email Address',
            desc: 'A valid email address was not detected. Ensure your email is clearly placed in the top header.'
        });
    }

    if (!structured.sections.includes('skills')) {
        recs.push({
            priority: 'high',
            title: 'Missing Dedicated Skills Section',
            desc: 'ATS systems look specifically for a "Skills" or "Technical Expertise" heading to parse candidate qualifications.'
        });
    }

    if (structured.experienceStats.quantificationCount === 0) {
        recs.push({
            priority: 'medium',
            title: 'Add Quantifiable Metrics & Results',
            desc: 'Include measurable metrics (e.g., "Increased performance by 30%", "Managed 10+ projects") in your bullet points to demonstrate real impact.'
        });
    }

    if (structured.experienceStats.passivePhrasesCount > 1) {
        recs.push({
            priority: 'medium',
            title: 'Replace Passive Phrases with Strong Action Verbs',
            desc: 'Phrases like "responsible for" or "helped with" weaken your experience. Use active verbs like "Architected", "Engineered", or "Spearheaded".'
        });
    }

    if (!structured.contact.hasLinkedin && !structured.contact.hasGithub) {
        recs.push({
            priority: 'low',
            title: 'Add Professional Social Links',
            desc: 'Including a LinkedIn or GitHub profile link increases recruiter trust and provides proof of work.'
        });
    }

    return recs;
}

module.exports = {
    SKILL_DICTIONARY,
    SECTION_HEADERS,
    ACTION_VERBS,
    extractContactInfo,
    extractSections,
    extractSkills,
    analyzeExperienceAndBullets,
    extractStructuredResume,
    calculateVersion2Scores,
    generatePrioritizedRecommendations
};
