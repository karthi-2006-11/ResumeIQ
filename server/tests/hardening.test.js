const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: 'GET',
                headers: { 'Accept': 'application/json', ...headers }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    server.close();
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, headers: res.headers, body: json });
                    } catch (e) {
                        resolve({ status: res.statusCode, headers: res.headers, body: data });
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

test('Security Hardening: Helmet security headers are present', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
});

test('Request ID Middleware: X-Request-ID is generated and returned in headers', async () => {
    const res = await get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['x-request-id']);
    assert.ok(res.headers['x-request-id'].length > 10);
});

test('Request ID Middleware: Custom X-Request-ID is validated and echoed back', async () => {
    const customId = 'test-request-id-12345';
    const res = await get('/api/health', { 'X-Request-ID': customId });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-request-id'], customId);
});

test('Readiness Probe: GET /api/ready returns readiness status', async () => {
    const res = await get('/api/ready');
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(typeof res.body.ready === 'boolean');
});

test('Production Error Sanitization: 404 error returns structured JSON error format with requestId', async () => {
    const res = await get('/api/non-existent-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.requestId);
});

function request(method, url, headers = {}) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const port = server.address().port;
            const http = require('http');

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: url,
                method: method,
                headers: headers
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    server.close();
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, headers: res.headers, body: json });
                    } catch (e) {
                        resolve({ status: res.statusCode, headers: res.headers, body: data });
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

test('CORS Preflight & Origin Verification: Allows GitHub Pages origin and responds to OPTIONS', async () => {
    const ghOrigin = 'https://karthi-2006-11.github.io';
    const preflight = await request('OPTIONS', '/api/v1/auth/register', {
        'Origin': ghOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization, accept'
    });

    assert.ok(preflight.status === 200 || preflight.status === 204);
    assert.strictEqual(preflight.headers['access-control-allow-origin'], ghOrigin);
    assert.strictEqual(preflight.headers['access-control-allow-credentials'], 'true');
    assert.ok(preflight.headers['access-control-allow-methods'].includes('POST'));
});
