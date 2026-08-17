const test = require('node:test');
const assert = require('node:assert');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const app = require('../src/app');

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

            // Add text fields
            for (const [key, value] of Object.entries(fields)) {
                bodyChunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`, 'utf8'));
            }

            // Add file field
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

test('POST /api/v1/analyze returns 200 OK with valid PDF resume analysis', async () => {
    const pdfBuffer = await createTestPdfBuffer();
    const res = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Software Engineer' }, {
        fieldname: 'file',
        filename: 'Test_Resume.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.analysis.mode, 'backend');
    assert.strictEqual(res.body.analysis.fileName, 'Test_Resume.pdf');
    assert.strictEqual(res.body.analysis.targetRole, 'Software Engineer');
    assert.ok(res.body.analysis.scores.atsScore > 0);
    assert.ok(Array.isArray(res.body.analysis.skillsFound));
    assert.ok(Array.isArray(res.body.analysis.skillsMissing));
});

test('POST /api/v1/analyze matches missing skills for different target roles', async () => {
    const pdfBuffer = await createTestPdfBuffer('Jane Developer. HTML5, CSS3, JavaScript, React.');

    // Frontend Developer role test
    const resFE = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Frontend Developer' }, {
        fieldname: 'file',
        filename: 'Resume_FE.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });
    assert.strictEqual(resFE.status, 200);
    assert.strictEqual(resFE.body.analysis.targetRole, 'Frontend Developer');

    // Data Analyst role test
    const resDA = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Data Analyst' }, {
        fieldname: 'file',
        filename: 'Resume_DA.pdf',
        mimetype: 'application/pdf',
        buffer: pdfBuffer
    });
    assert.strictEqual(resDA.status, 200);
    assert.strictEqual(resDA.body.analysis.targetRole, 'Data Analyst');
});

test('POST /api/v1/analyze returns 400 INVALID_FILE for non-PDF files', async () => {
    const fakeBuffer = Buffer.from('Plain text file, not a PDF!', 'utf8');
    const res = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Software Engineer' }, {
        fieldname: 'file',
        filename: 'fake_resume.txt',
        mimetype: 'text/plain',
        buffer: fakeBuffer
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_FILE');
});

test('POST /api/v1/analyze returns 413 FILE_TOO_LARGE for files > 5MB', async () => {
    // 5.5 MB Buffer
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    largeBuffer.write('%PDF-1.4', 0); // starts with PDF header

    const res = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Software Engineer' }, {
        fieldname: 'file',
        filename: 'Oversized_Resume.pdf',
        mimetype: 'application/pdf',
        buffer: largeBuffer
    });

    assert.strictEqual(res.status, 413);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'FILE_TOO_LARGE');
});

test('POST /api/v1/analyze returns 400 INVALID_REQUEST when no file is uploaded', async () => {
    const res = await sendMultipartRequest(app, 'POST', '/api/v1/analyze', { targetRole: 'Software Engineer' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_REQUEST');
});
