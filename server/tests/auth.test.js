const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Analysis = require('../src/models/analysis.model');
const JobMatch = require('../src/models/job-match.model');
const { PDFDocument, StandardFonts } = require('pdf-lib');

// PDF Generator Helper
async function createTestPdfBuffer(textStr = 'Jane Doe. Software Engineer. Skills: HTML5, CSS3, JavaScript, SQL, REST APIs, Git.') {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(textStr, { x: 50, y: 700, size: 12, font });
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false, compress: false });
    return Buffer.from(pdfBytes);
}

// JSON Request Helper
function jsonRequest(app, method, url, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');
            const payload = body ? Buffer.from(JSON.stringify(body), 'utf8') : null;

            const headers = {
                'Accept': 'application/json'
            };
            if (payload) {
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = payload.length;
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: method,
                headers
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

            if (payload) req.write(payload);
            req.end();
        });
    });
}

// Multipart FormData Helper
function sendMultipartRequest(app, method, url, fields = {}, fileObj = null, token = null) {
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

            const headers = {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payload.length
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: method,
                headers
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

test('POST /api/v1/auth/register creates user account and returns JWT token', async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const res = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
        email,
        password: 'SecurePassword123!'
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, email.toLowerCase());
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.passwordHash, undefined);
});

test('POST /api/v1/auth/register returns 400 for weak/short password (<8 chars)', async () => {
    const res = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
        email: 'weakpass@example.com',
        password: 'short'
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'WEAK_PASSWORD');
});

test('POST /api/v1/auth/register returns 400 for duplicate email registration', async () => {
    const email = `duplicate_${Date.now()}@example.com`;
    await jsonRequest(app, 'POST', '/api/v1/auth/register', { email, password: 'Password123!' });

    const res2 = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email, password: 'Password123!' });
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.error.code, 'EMAIL_ALREADY_EXISTS');
});

test('POST /api/v1/auth/login returns 200 OK and JWT token for valid credentials', async () => {
    const email = `loginuser_${Date.now()}@example.com`;
    const password = 'MySecretPassword123!';
    await jsonRequest(app, 'POST', '/api/v1/auth/register', { email, password });

    const res = await jsonRequest(app, 'POST', '/api/v1/auth/login', { email, password });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
});

test('POST /api/v1/auth/login returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    const email = `wrongpass_${Date.now()}@example.com`;
    await jsonRequest(app, 'POST', '/api/v1/auth/register', { email, password: 'Password123!' });

    const res = await jsonRequest(app, 'POST', '/api/v1/auth/login', { email, password: 'WrongPassword999!' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('GET /api/v1/auth/me returns current user profile when valid token provided', async () => {
    const email = `me_${Date.now()}@example.com`;
    const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email, password: 'Password123!' });
    const token = regRes.body.token;

    const meRes = await jsonRequest(app, 'GET', '/api/v1/auth/me', null, token);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.success, true);
    assert.strictEqual(meRes.body.user.email, email.toLowerCase());
});

test('GET /api/v1/auth/me returns 401 AUTHENTICATION_REQUIRED when token is missing', async () => {
    const meRes = await jsonRequest(app, 'GET', '/api/v1/auth/me');
    assert.strictEqual(meRes.status, 401);
    assert.strictEqual(meRes.body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('User Data Isolation: User B cannot view or delete User A analysis record', async () => {
    // 1. User A Register & Upload Analysis
    const emailA = `usera_${Date.now()}@example.com`;
    const regA = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email: emailA, password: 'Password123!' });
    const tokenA = regA.body.token;

    const pdfBuffer = await createTestPdfBuffer();
    const uploadRes = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Software Engineer' }, {
        fieldname: 'file',
        filename: 'ResumeA.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    }, tokenA);

    const recordIdA = uploadRes.body.analysis?.id;

    // 2. User B Register
    const emailB = `userb_${Date.now()}@example.com`;
    const regB = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email: emailB, password: 'Password123!' });
    const tokenB = regB.body.token;

    // User B history list must NOT contain User A's record
    const listB = await jsonRequest(app, 'GET', '/api/v1/analyses', null, tokenB);
    assert.strictEqual(listB.status, 200);
    const hasRecordA = (listB.body.data || []).some(item => item.id === recordIdA);
    assert.strictEqual(hasRecordA, false);

    // User B attempting GET User A's record returns 404 NOT_FOUND
    if (recordIdA) {
        const getB = await jsonRequest(app, 'GET', `/api/v1/analyses/${recordIdA}`, null, tokenB);
        assert.strictEqual(getB.status, 404);

        // User B attempting DELETE User A's record returns 404 NOT_FOUND
        const deleteB = await jsonRequest(app, 'DELETE', `/api/v1/analyses/${recordIdA}`, null, tokenB);
        assert.strictEqual(deleteB.status, 404);
    }
});

test('User Data Isolation: User B cannot view or delete User A job match record', async () => {
    // 1. User A Register & Upload Job Match
    const emailA = `usera_jm_${Date.now()}@example.com`;
    const regA = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email: emailA, password: 'Password123!' });
    const tokenA = regA.body.token;

    const pdfBuffer = await createTestPdfBuffer();
    const matchRes = await sendMultipartRequest(app, 'POST', '/api/v1/job-match', {
        targetRole: 'Software Engineer',
        jobDescription: 'Required: HTML5, CSS3, JavaScript, React, Git.'
    }, {
        fieldname: 'file',
        filename: 'ResumeA.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    }, tokenA);

    const matchIdA = matchRes.body.jobMatch?.id;

    // 2. User B Register
    const emailB = `userb_jm_${Date.now()}@example.com`;
    const regB = await jsonRequest(app, 'POST', '/api/v1/auth/register', { email: emailB, password: 'Password123!' });
    const tokenB = regB.body.token;

    if (matchIdA) {
        const getB = await jsonRequest(app, 'GET', `/api/v1/job-matches/${matchIdA}`, null, tokenB);
        assert.strictEqual(getB.status, 404);

        const deleteB = await jsonRequest(app, 'DELETE', `/api/v1/job-matches/${matchIdA}`, null, tokenB);
        assert.strictEqual(deleteB.status, 404);
    }
});
