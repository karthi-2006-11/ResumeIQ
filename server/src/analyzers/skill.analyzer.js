/**
 * Server-Side Skill Analyzer & Target Role Requirements Dictionary
 */

const SKILLS_DICTIONARY = [
    // Programming Languages
    { name: 'JavaScript', pattern: /\b(javascript|js|es6|es2020|ecmascript)\b/i },
    { name: 'TypeScript', pattern: /\b(typescript|ts)\b/i },
    { name: 'Python', pattern: /\b(python|py|django|flask|fastapi)\b/i },
    { name: 'Java', pattern: /\b(java)\b/i },
    { name: 'C++', pattern: /\b(c\+\+|cpp)\b/i },
    { name: 'C#', pattern: /\b(c#|\.net|dotnet)\b/i },
    { name: 'Go', pattern: /\b(golang|go)\b/i },
    { name: 'PHP', pattern: /\b(php|laravel)\b/i },
    { name: 'Ruby', pattern: /\b(ruby|rails)\b/i },
    { name: 'Rust', pattern: /\b(rust)\b/i },
    { name: 'Swift', pattern: /\b(swift|ios)\b/i },
    { name: 'Kotlin', pattern: /\b(kotlin|android)\b/i },
    { name: 'SQL', pattern: /\b(sql|mysql|postgresql|postgres|tsql|plsql)\b/i },

    // Web Technologies & Frameworks
    { name: 'HTML5', pattern: /\b(html|html5)\b/i },
    { name: 'CSS3', pattern: /\b(css|css3|sass|scss|less)\b/i },
    { name: 'React', pattern: /\b(react|reactjs|react\.js)\b/i },
    { name: 'Next.js', pattern: /\b(next|nextjs|next\.js)\b/i },
    { name: 'Angular', pattern: /\b(angular|angularjs)\b/i },
    { name: 'Vue.js', pattern: /\b(vue|vuejs|vue\.js|nuxt)\b/i },
    { name: 'Node.js', pattern: /\b(node|nodejs|node\.js)\b/i },
    { name: 'Express.js', pattern: /\b(express|expressjs|express\.js)\b/i },
    { name: 'REST APIs', pattern: /\b(rest|restful|api|apis|json|http)\b/i },
    { name: 'GraphQL', pattern: /\b(graphql)\b/i },
    { name: 'Tailwind CSS', pattern: /\b(tailwind)\b/i },
    { name: 'Bootstrap', pattern: /\b(bootstrap)\b/i },
    { name: 'Redux', pattern: /\b(redux|zustand|mobx)\b/i },

    // Databases & Storage
    { name: 'MongoDB', pattern: /\b(mongodb|mongo)\b/i },
    { name: 'PostgreSQL', pattern: /\b(postgres|postgresql)\b/i },
    { name: 'MySQL', pattern: /\b(mysql)\b/i },
    { name: 'Redis', pattern: /\b(redis)\b/i },
    { name: 'Firebase', pattern: /\b(firebase|firestore)\b/i },

    // Cloud, DevOps & Tools
    { name: 'AWS', pattern: /\b(aws|amazon web services|s3|ec2|lambda)\b/i },
    { name: 'Azure', pattern: /\b(azure)\b/i },
    { name: 'Docker', pattern: /\b(docker|containers)\b/i },
    { name: 'Kubernetes', pattern: /\b(kubernetes|k8s)\b/i },
    { name: 'Git & GitHub', pattern: /\b(git|github|gitlab|bitbucket)\b/i },
    { name: 'CI/CD', pattern: /\b(ci\/cd|jenkins|actions|circleci)\b/i },
    { name: 'Linux', pattern: /\b(linux|bash|shell|terminal)\b/i },

    // Data & AI
    { name: 'Machine Learning', pattern: /\b(machine learning|ml|deep learning)\b/i },
    { name: 'Data Analysis', pattern: /\b(data analysis|analytics|bi)\b/i },
    { name: 'Pandas', pattern: /\b(pandas)\b/i },
    { name: 'NumPy', pattern: /\b(numpy)\b/i },
    { name: 'TensorFlow', pattern: /\b(tensorflow)\b/i },
    { name: 'PyTorch', pattern: /\b(pytorch)\b/i },
    { name: 'Tableau', pattern: /\b(tableau)\b/i },
    { name: 'Power BI', pattern: /\b(power bi|powerbi)\b/i },

    // Agile & Methodology
    { name: 'Agile & Scrum', pattern: /\b(agile|scrum|kanban)\b/i },
    { name: 'Jira', pattern: /\b(jira|confluence)\b/i },
    { name: 'Figma', pattern: /\b(figma|ui\/ux|design)\b/i },
    { name: 'Testing / QA', pattern: /\b(jest|cypress|unit testing|qa|selenium)\b/i }
];

const ROLE_REQUIREMENTS = {
    'Software Engineer': [
        'JavaScript', 'Python', 'Java', 'SQL', 'Git & GitHub', 'REST APIs', 'Node.js', 'Docker', 'Agile & Scrum'
    ],
    'Frontend Developer': [
        'HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Responsive Design', 'Git & GitHub', 'REST APIs', 'Testing / QA'
    ],
    'Backend Engineer': [
        'Python', 'Node.js', 'Java', 'SQL', 'PostgreSQL', 'MongoDB', 'REST APIs', 'Docker', 'Git & GitHub', 'AWS'
    ],
    'Data Analyst': [
        'SQL', 'Python', 'Data Analysis', 'Pandas', 'NumPy', 'Excel', 'Tableau', 'Power BI', 'Machine Learning'
    ],
    'Product Manager': [
        'Agile & Scrum', 'Jira', 'Data Analysis', 'Product Strategy', 'Roadmapping', 'User Research', 'Figma'
    ],
    'General Professional': [
        'Project Management', 'Communication', 'Git & GitHub', 'Problem Solving', 'Data Analysis', 'SQL'
    ]
};

function detectSkills(text) {
    const found = [];
    for (const skillObj of SKILLS_DICTIONARY) {
        if (skillObj.pattern.test(text)) {
            found.push(skillObj.name);
        }
    }
    return found;
}

function matchRoleSkills(foundSkills, targetRole) {
    const expected = ROLE_REQUIREMENTS[targetRole] || ROLE_REQUIREMENTS['Software Engineer'];
    const matchingSkills = expected.filter(s => foundSkills.includes(s));
    const missingSkills = expected.filter(s => !foundSkills.includes(s));
    const matchPct = Math.round((matchingSkills.length / expected.length) * 100);

    return {
        expectedSkills: expected,
        matchingSkills,
        missingSkills,
        matchPct: Math.max(20, Math.min(98, matchPct))
    };
}

module.exports = {
    detectSkills,
    matchRoleSkills,
    ROLE_REQUIREMENTS
};
