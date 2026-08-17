const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const mongoose = require('mongoose');
const Analysis = require('../src/models/analysis.model');
const { generateToken } = require('../src/services/auth.service');

// HTTP Request Helper with Auth Token support
function request(app, token = null) {
    const defaultToken = token || generateToken(new mongoose.Types.ObjectId().toString());

    return {
        get(url) {
            return executeRequest('GET', url);
        },
        delete(url) {
            return executeRequest('DELETE', url);
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

                const headers = {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${defaultToken}`
                };

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

                if (postData) req.write(postData);
                req.end();
            });
        });
    }
}

test('GET /api/v1/analyses returns 200 OK with paginated history list for authenticated user', async () => {
    const res = await request(app).get('/api/v1/analyses?page=1&limit=10');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.strictEqual(res.body.pagination.limit, 10);
});

test('GET /api/v1/analyses/:id returns 400 INVALID_ANALYSIS_ID for malformed IDs', async () => {
    const res = await request(app).get('/api/v1/analyses/invalid-mongo-id-123');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_ANALYSIS_ID');
});

test('GET /api/v1/analyses/:id returns 404 ANALYSIS_NOT_FOUND for non-existent ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/v1/analyses/${fakeId}`);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'ANALYSIS_NOT_FOUND');
});

test('DELETE /api/v1/analyses/:id returns 400 INVALID_ANALYSIS_ID for malformed IDs', async () => {
    const res = await request(app).delete('/api/v1/analyses/bad-id');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_ANALYSIS_ID');
});

test('DELETE /api/v1/analyses/:id returns 404 ANALYSIS_NOT_FOUND for non-existent ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/v1/analyses/${fakeId}`);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'ANALYSIS_NOT_FOUND');
});

test('Privacy Verification: Analysis Mongoose Model schema does not contain raw text or buffer fields', () => {
    const schemaPaths = Object.keys(Analysis.schema.paths);
    assert.strictEqual(schemaPaths.includes('rawText'), false);
    assert.strictEqual(schemaPaths.includes('rawResumeText'), false);
    assert.strictEqual(schemaPaths.includes('pdfBuffer'), false);
    assert.strictEqual(schemaPaths.includes('fileBuffer'), false);
    assert.strictEqual(schemaPaths.includes('resumePdf'), false);
});
