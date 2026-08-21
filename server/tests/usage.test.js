const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const User = require('../src/models/user.model');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { reserveQuota, releaseQuota, getCurrentUtcPeriod } = require('../src/services/usage.service');
const { isConnected } = require('../src/config/database');
const { mockUserStore } = require('../src/services/auth.service');

// Helper to generate test PDF buffer
async function createTestPdfBuffer(textStr = 'John Developer. Skills: React, Node.js, JavaScript, Python, Express.') {
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

            const headers = { 'Accept': 'application/json' };
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

// Multipart Form Upload Request Helper (Multer expects field name "file")
function uploadRequest(app, url, buffer, filename, fields = {}, token = null) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');

            const boundary = '----TestBoundary' + Math.random().toString(16).substring(2);
            let bodyParts = [];

            for (const [key, value] of Object.entries(fields)) {
                bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
            }

            bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`));
            bodyParts.push(buffer);
            bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

            const fullBody = Buffer.concat(bodyParts);

            const headers = {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': fullBody.length,
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: 'POST',
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

            req.write(fullBody);
            req.end();
        });
    });
}

// Helper to set user usage state in test environment (supports both MongoDB and offline mockUserStore)
async function setUserUsageForTest(userId, analysisCount, jobMatchCount, lastResetDate) {
    if (isConnected()) {
        await User.findByIdAndUpdate(userId, {
            $set: {
                'usage.analysisCount': analysisCount,
                'usage.jobMatchCount': jobMatchCount,
                'usage.lastResetDate': lastResetDate
            }
        });
    } else {
        const mock = mockUserStore.get(userId);
        if (mock) {
            mock.usage = {
                analysisCount,
                jobMatchCount,
                lastResetDate
            };
        }
    }
}

test('Phase 23 — Account Usage Tracking & Tiered Quota Guard Suite', async (t) => {

    await t.test('1. User Defaults — New user receives free tier and zero usage counters', async () => {
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email: `newuser_${Date.now()}@example.com`,
            password: 'Password123!'
        });

        assert.strictEqual(regRes.status, 201);
        assert.strictEqual(regRes.body.success, true);
        assert.strictEqual(regRes.body.user.tier, 'free');
    });

    await t.test('2. Usage API — Authenticated user can fetch usage info; unauthenticated gets 401', async () => {
        const email = `usage_user_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const token = regRes.body.token;

        // Unauthenticated request
        const unauthRes = await jsonRequest(app, 'GET', '/api/v1/auth/usage');
        assert.strictEqual(unauthRes.status, 401);

        // Authenticated request
        const authRes = await jsonRequest(app, 'GET', '/api/v1/auth/usage', null, token);
        assert.strictEqual(authRes.status, 200);
        assert.strictEqual(authRes.body.success, true);
        assert.strictEqual(authRes.body.usage.tier, 'free');
        assert.strictEqual(authRes.body.usage.analysis.used, 0);
        assert.strictEqual(authRes.body.usage.analysis.limit, 10);
        assert.strictEqual(authRes.body.usage.analysis.remaining, 10);
        assert.strictEqual(authRes.body.usage.jobMatch.used, 0);
        assert.strictEqual(authRes.body.usage.jobMatch.limit, 5);
        assert.strictEqual(authRes.body.usage.jobMatch.remaining, 5);
        assert.ok(authRes.body.usage.resetDate);
    });

    await t.test('3. Analysis Quota — Successful analysis increments usage; invalid PDF does not consume quota', async () => {
        const email = `quota_test_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const token = regRes.body.token;
        const pdfBuffer = await createTestPdfBuffer();

        // 1. Invalid PDF upload (fake non-pdf signature)
        const fakeBuffer = Buffer.from('Plain text file claiming to be PDF', 'utf8');
        const invalidRes = await uploadRequest(app, '/api/v1/analyze', fakeBuffer, 'fake.pdf', { targetRole: 'Engineer' }, token);
        assert.strictEqual(invalidRes.status, 400);
        assert.strictEqual(invalidRes.body.error.code, 'INVALID_PDF_SIGNATURE');

        // Usage must still be 0 after invalid attempt
        let usageRes = await jsonRequest(app, 'GET', '/api/v1/auth/usage', null, token);
        assert.strictEqual(usageRes.body.usage.analysis.used, 0);

        // 2. Successful valid PDF upload
        const validRes = await uploadRequest(app, '/api/v1/analyze', pdfBuffer, 'valid.pdf', { targetRole: 'Engineer' }, token);
        assert.strictEqual(validRes.status, 200);
        assert.strictEqual(validRes.body.success, true);

        // Usage must now be 1
        usageRes = await jsonRequest(app, 'GET', '/api/v1/auth/usage', null, token);
        assert.strictEqual(usageRes.body.usage.analysis.used, 1);
        assert.strictEqual(usageRes.body.usage.analysis.remaining, 9);
    });

    await t.test('4. Analysis Quota Exhaustion — Reaching 10 analyses rejects 11th with HTTP 429 QUOTA_EXCEEDED', async () => {
        const email = `exhaust_test_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const userId = regRes.body.user.id;
        const token = regRes.body.token;

        // Set analysisCount to 10 (free tier limit)
        const currentPeriod = getCurrentUtcPeriod();
        await setUserUsageForTest(userId, 10, 0, currentPeriod);

        const pdfBuffer = await createTestPdfBuffer();
        const overLimitRes = await uploadRequest(app, '/api/v1/analyze', pdfBuffer, 'overlimit.pdf', { targetRole: 'Engineer' }, token);

        assert.strictEqual(overLimitRes.status, 429);
        assert.strictEqual(overLimitRes.body.success, false);
        assert.strictEqual(overLimitRes.body.error.code, 'QUOTA_EXCEEDED');
        assert.ok(overLimitRes.body.error.message.includes('quota'));
    });

    await t.test('5. Job Match Quota Exhaustion — Reaching 5 job matches rejects 6th with HTTP 429', async () => {
        const email = `jobmatch_quota_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const userId = regRes.body.user.id;
        const token = regRes.body.token;

        const currentPeriod = getCurrentUtcPeriod();
        await setUserUsageForTest(userId, 0, 5, currentPeriod);

        const pdfBuffer = await createTestPdfBuffer();
        const overLimitRes = await uploadRequest(app, '/api/v1/job-match', pdfBuffer, 'match.pdf', {
            targetRole: 'Engineer',
            jobDescription: 'Seeking a senior software engineer with JavaScript, React, Node.js and SQL experience.'
        }, token);

        assert.strictEqual(overLimitRes.status, 429);
        assert.strictEqual(overLimitRes.body.error.code, 'QUOTA_EXCEEDED');
    });

    await t.test('6. Monthly Reset Semantics — Previous month period resets usage counters to zero', async () => {
        const email = `reset_test_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const userId = regRes.body.user.id;
        const token = regRes.body.token;

        // Set outdated reset date '2025-01' with maxed usage
        await setUserUsageForTest(userId, 10, 5, '2025-01');

        // Request usage API
        const usageRes = await jsonRequest(app, 'GET', '/api/v1/auth/usage', null, token);
        assert.strictEqual(usageRes.status, 200);
        assert.strictEqual(usageRes.body.usage.analysis.used, 0);
        assert.strictEqual(usageRes.body.usage.analysis.remaining, 10);
        assert.strictEqual(usageRes.body.usage.jobMatch.used, 0);
        assert.strictEqual(usageRes.body.usage.jobMatch.remaining, 5);
        assert.strictEqual(usageRes.body.usage.period, getCurrentUtcPeriod());
    });

    await t.test('7. Atomic Concurrency Protection — Simultaneous quota attempts cannot exceed configured quota limit', async () => {
        const email = `concurrent_quota_${Date.now()}@example.com`;
        const regRes = await jsonRequest(app, 'POST', '/api/v1/auth/register', {
            email,
            password: 'Password123!'
        });
        const userId = regRes.body.user.id;
        const currentPeriod = getCurrentUtcPeriod();

        // Set analysisCount to 9 (1 slot remaining out of 10 limit)
        await setUserUsageForTest(userId, 9, 0, currentPeriod);

        // Fire 5 simultaneous reservation attempts
        const results = await Promise.all([
            reserveQuota(userId, 'analysis'),
            reserveQuota(userId, 'analysis'),
            reserveQuota(userId, 'analysis'),
            reserveQuota(userId, 'analysis'),
            reserveQuota(userId, 'analysis')
        ]);

        const successfulCount = results.filter(r => r.success === true).length;
        const rejectedCount = results.filter(r => r.success === false).length;

        assert.strictEqual(successfulCount, 1, 'Only exactly 1 reservation should succeed when 1 slot remains');
        assert.strictEqual(rejectedCount, 4, '4 reservations must be rejected due to quota limit');
    });

    await t.test('8. Guest Behavior — Unauthenticated guests bypass account quota and analyze successfully', async () => {
        const pdfBuffer = await createTestPdfBuffer();
        const guestRes = await uploadRequest(app, '/api/v1/analyze', pdfBuffer, 'guest.pdf', { targetRole: 'Engineer' });
        assert.strictEqual(guestRes.status, 200);
        assert.strictEqual(guestRes.body.success, true);
    });

});
