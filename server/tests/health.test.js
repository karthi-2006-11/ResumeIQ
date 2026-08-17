const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

function request(app) {
    return {
        get(url) {
            return executeRequest('GET', url);
        },
        post(url, body = {}) {
            return executeRequest('POST', url, body);
        }
    };

    function executeRequest(method, url, body = null) {
        return new Promise((resolve, reject) => {
            const server = app.listen(0, () => {
                const port = server.address().port;
                const http = require('http');
                const postData = body ? JSON.stringify(body) : '';

                const req = http.request({
                    hostname: '127.0.0.1',
                    port: port,
                    path: url,
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        server.close();
                        try {
                            const body = data ? JSON.parse(data) : {};
                            resolve({ status: res.statusCode, body });
                        } catch (e) {
                            resolve({ status: res.statusCode, body: data });
                        }
                    });
                });

                req.on('error', (err) => {
                    server.close();
                    reject(err);
                });

                if (postData) req.write(postData);
                req.end();
            });
        });
    }
}

test('GET /api/health returns 200 OK and healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'ResumeIQ API');
});

test('GET /api/unknown returns 404 NOT_FOUND JSON error', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

test('POST /api/v1/analyze returns 400 INVALID_REQUEST when request is missing multipart file', async () => {
    const res = await request(app).post('/api/v1/analyze', { targetRole: 'Software Engineer' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_REQUEST');
});
