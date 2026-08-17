const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { SYSTEM_PROMPT } = require('../src/services/ai/ai.prompt');

// JSON Request Helper
function postJson(app, url, body) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');
            const payload = Buffer.from(JSON.stringify(body), 'utf8');

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': payload.length
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    server.close();
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, body: json });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: data });
                    }
                });
            });

            req.on('error', (err) => {
                server.close();
                reject(err);
            });

            req.write(payload);
            req.end();
        });
    });
}

test('POST /api/v1/ai/analyze task: resume-feedback returns 200 OK with insights', async () => {
    const res = await postJson(app, '/api/v1/ai/analyze', {
        task: 'resume-feedback',
        targetRole: 'Frontend Developer',
        resumeContext: {
            summary: 'Experienced developer with skills in HTML and CSS.',
            skillsFound: ['HTML5', 'CSS3', 'JavaScript'],
            skillsMissing: ['React', 'TypeScript']
        }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.ai.available, true);
    assert.ok(res.body.ai.insights.summaryFeedback);
    assert.ok(Array.isArray(res.body.ai.insights.priorityRecommendations));
});

test('POST /api/v1/ai/analyze task: job-match-explanation returns 200 OK', async () => {
    const res = await postJson(app, '/api/v1/ai/analyze', {
        task: 'job-match-explanation',
        targetRole: 'Software Engineer',
        resumeContext: { skillsFound: ['JavaScript'], skillsMissing: ['Docker'] },
        jobMatchContext: { matchScore: 80, matchingSkills: ['JavaScript'], missingSkills: ['Docker'] }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ai.insights.jobMatchExplanation);
});

test('POST /api/v1/ai/analyze task: improvement-plan returns 200 OK with prioritized actions', async () => {
    const res = await postJson(app, '/api/v1/ai/analyze', {
        task: 'improvement-plan',
        targetRole: 'Backend Engineer',
        resumeContext: { skillsMissing: ['PostgreSQL', 'AWS'] }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ai.insights.priorityRecommendations.length > 0);
});

test('POST /api/v1/ai/analyze returns 400 UNSUPPORTED_AI_TASK for illegal task name', async () => {
    const res = await postJson(app, '/api/v1/ai/analyze', {
        task: 'illegal-prompt-task',
        targetRole: 'Software Engineer'
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNSUPPORTED_AI_TASK');
});

test('AI Safety Verification: System prompt enforces non-fabrication, prompt injection defense, and score preservation', () => {
    assert.ok(SYSTEM_PROMPT.includes('UNTRUSTED DATA'));
    assert.ok(SYSTEM_PROMPT.includes('NO FABRICATION'));
    assert.ok(SYSTEM_PROMPT.includes('NO SCORE OVERRIDES'));
    assert.ok(SYSTEM_PROMPT.includes('JSON object'));
});
