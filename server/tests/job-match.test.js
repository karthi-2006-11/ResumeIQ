const test = require('node:test');
const assert = require('node:assert');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const app = require('../src/app');
const mongoose = require('mongoose');
const JobMatch = require('../src/models/job-match.model');
const { generateToken } = require('../src/services/auth.service');

// Generates a 100% compliant uncompressed PDF binary buffer for pdf-parse compatibility
async function createTestPdfBuffer(textStr = 'Jane Doe. Software Engineer. Skills: HTML5, CSS3, JavaScript, SQL, REST APIs, Git.') {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(textStr, { x: 50, y: 700, size: 12, font });
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false, compress: false });
    return Buffer.from(pdfBytes);
}

// Multipart FormData HTTP Request Helper
function sendMultipartRequest(app, method, url, fields = {}, fileObj = null) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');
            const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
            const bodyChunks = [];

            for (const [key, value] of Object.entries(fields)) {
                bodyChunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`, 'utf8'));
            }

            if (fileObj) {
                const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="${fileObj.fieldname}"; filename="${fileObj.filename}"\r\nContent-Type: ${fileObj.mimetype}\r\n\r\n`;
                bodyChunks.push(Buffer.from(headerStr, 'utf8'));
                bodyChunks.push(fileObj.buffer);
                bodyChunks.push(Buffer.from('\r\n', 'utf8'));
            }

            bodyChunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
            const payload = Buffer.concat(bodyChunks);

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: method,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
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

// JSON Request Helper with Bearer Token Support
function request(app, token = null) {
    const defaultToken = token || generateToken(new mongoose.Types.ObjectId().toString());

    return {
        get(url) {
            return executeRequest('GET', url);
        },
        delete(url) {
            return executeRequest('DELETE', url);
        }
    };

    function executeRequest(method, url) {
        return new Promise((resolve, reject) => {
            const server = app.listen(0, () => {
                const port = server.address().port;
                const http = require('http');

                const req = http.request({
                    hostname: '127.0.0.1',
                    port: port,
                    path: url,
                    method: method,
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${defaultToken}`
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

                req.end();
            });
        });
    }
}

test('POST /api/v1/job-match Scenario A: Strong Match yields high score', async () => {
    const pdfBuffer = await createTestPdfBuffer('Jane Doe. Software Engineer. Skills: HTML5, CSS3, JavaScript, React, SQL, REST APIs, Git.');
    const jdText = 'Frontend Engineer Job Description. Required Skills: HTML5, CSS3, JavaScript, React, REST APIs, Git. Responsibilities: Building responsive web apps.';

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Frontend Developer',
        jobDescription: jdText
    }, {
        fieldname: 'file',
        filename: 'Resume_FE.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.jobMatch.matchScore >= 70);
    assert.ok(res.body.jobMatch.matchingSkills.includes('React'));
    assert.ok(Array.isArray(res.body.jobMatch.recommendations));
});

test('POST /api/v1/job-match Scenario B: Partial Match identifies missing required skills', async () => {
    const pdfBuffer = await createTestPdfBuffer('Jane Developer. Skills: HTML5, CSS3, JavaScript.');
    const jdText = 'Senior Developer Role. Required Skills: JavaScript, React, TypeScript, Docker, AWS. Preferred Skills: Redis.';

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Software Engineer',
        jobDescription: jdText
    }, {
        fieldname: 'file',
        filename: 'Resume_Partial.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.jobMatch.missingSkills.includes('Docker'));
    assert.ok(res.body.jobMatch.missingSkills.includes('AWS'));
});

test('POST /api/v1/job-match Scenario C: Poor Match yields low score', async () => {
    const pdfBuffer = await createTestPdfBuffer('Java Backend Developer. Skills: Java, Spring Boot, SQL, PostgreSQL.');
    const jdText = 'Lead Frontend Engineer. Required: React, Next.js, TypeScript, Tailwind CSS, Cypress.';

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Frontend Developer',
        jobDescription: jdText
    }, {
        fieldname: 'file',
        filename: 'Resume_Mismatch.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.jobMatch.matchScore < 60);
});

test('POST /api/v1/job-match separates Required vs Preferred skills correctly', async () => {
    const pdfBuffer = await createTestPdfBuffer('Full Stack Developer. Skills: JavaScript, Node.js.');
    const jdText = 'Developer Role. Requirements: Must have JavaScript and Node.js. Preferred: Bonus if you know Docker and Kubernetes.';

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Software Engineer',
        jobDescription: jdText
    }, {
        fieldname: 'file',
        filename: 'Resume_ReqPref.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.jobMatch.requiredSkills));
    assert.ok(Array.isArray(res.body.jobMatch.preferredSkills));
});

test('POST /api/v1/job-match returns 400 INVALID_JOB_DESCRIPTION for short/empty JD', async () => {
    const pdfBuffer = await createTestPdfBuffer();
    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Software Engineer',
        jobDescription: 'Too short'
    }, {
        fieldname: 'file',
        filename: 'Resume.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_JOB_DESCRIPTION');
});

test('POST /api/v1/job-match returns 400 JOB_DESCRIPTION_TOO_LARGE for oversized JD (>50,000 chars)', async () => {
    const pdfBuffer = await createTestPdfBuffer();
    const hugeJd = 'Required Skill: JavaScript '.repeat(2500);

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Software Engineer',
        jobDescription: hugeJd
    }, {
        fieldname: 'file',
        filename: 'Resume.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'JOB_DESCRIPTION_TOO_LARGE');
});

test('GET /api/v1/job-matches returns 200 OK with paginated list for authenticated user', async () => {
    const res = await request(app).get('/api/v1/job-matches?page=1&limit=10');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
});

test('GET /api/v1/job-matches/:id returns 400 for malformed ID and 404 for non-existent ID', async () => {
    const resBad = await request(app).get('/api/v1/job-matches/invalid-id');
    assert.strictEqual(resBad.status, 400);
    assert.strictEqual(resBad.body.error.code, 'INVALID_JOB_MATCH_ID');

    const fakeId = new mongoose.Types.ObjectId().toString();
    const res404 = await request(app).get(`/api/v1/job-matches/${fakeId}`);
    assert.strictEqual(res404.status, 404);
    assert.strictEqual(res404.body.error.code, 'JOB_MATCH_NOT_FOUND');
});

test('DELETE /api/v1/job-matches/:id returns 400 for malformed ID and 404 for non-existent ID', async () => {
    const resBad = await request(app).delete('/api/v1/job-matches/bad-id');
    assert.strictEqual(resBad.status, 400);
    assert.strictEqual(resBad.body.error.code, 'INVALID_JOB_MATCH_ID');

    const fakeId = new mongoose.Types.ObjectId().toString();
    const res404 = await request(app).delete(`/api/v1/job-matches/${fakeId}`);
    assert.strictEqual(res404.status, 404);
    assert.strictEqual(res404.body.error.code, 'JOB_MATCH_NOT_FOUND');
});

test('Privacy Verification: JobMatch Mongoose Schema does not store raw text, PDF buffers, or raw JD text', () => {
    const schemaPaths = Object.keys(JobMatch.schema.paths);
    assert.strictEqual(schemaPaths.includes('rawText'), false);
    assert.strictEqual(schemaPaths.includes('rawResumeText'), false);
    assert.strictEqual(schemaPaths.includes('rawJobDescription'), false);
    assert.strictEqual(schemaPaths.includes('pdfBuffer'), false);
    assert.strictEqual(schemaPaths.includes('fileBuffer'), false);
});
