const pdfParse = require('pdf-parse');

/**
 * Validates PDF File Magic Bytes Header (%PDF- -> 0x25 0x50 0x44 0x46 0x2D)
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidPdfBuffer(buffer) {
    if (!buffer || buffer.length < 5) return false;
    const header = buffer.toString('utf8', 0, 5);
    return header === '%PDF-';
}

/**
 * Parses PDF Buffer and extracts text and metadata
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, numPages: number }>}
 */
async function parsePdfBuffer(buffer) {
    // 1. Zero-Byte / Empty Check
    if (!buffer || buffer.length === 0) {
        const error = new Error('The uploaded file is empty (0 bytes). Please attach a valid PDF document.');
        error.code = 'EMPTY_FILE';
        error.statusCode = 400;
        throw error;
    }

    // 2. Signature Check (%PDF- / 0x25 0x50 0x44 0x46 0x2D)
    if (!isValidPdfBuffer(buffer)) {
        const error = new Error('File signature check failed. The uploaded file is not a valid PDF document.');
        error.code = 'INVALID_PDF_SIGNATURE';
        error.statusCode = 400;
        throw error;
    }

    // 3. Parse PDF via pdf-parse passing typed array for buffer alignment
    try {
        const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const data = await pdfParse(uint8Array);
        const text = data.text ? data.text.trim() : '';

        return {
            text,
            numPages: data.numpages || 1
        };
    } catch (err) {
        console.error('[PdfService] pdf-parse extraction error:', err.message);
        const isPasswordProtected = /password|encrypt/i.test(err.message || '') || err.name === 'PasswordException';

        const error = new Error(
            isPasswordProtected
                ? 'The uploaded PDF is password protected or encrypted. Please upload an unprotected PDF document.'
                : 'Unable to extract text from PDF document. The file structure is corrupted or invalid.'
        );
        error.code = isPasswordProtected ? 'PASSWORD_PROTECTED_PDF' : 'CORRUPTED_PDF';
        error.statusCode = 422;
        throw error;
    }
}

module.exports = {
    isValidPdfBuffer,
    parsePdfBuffer
};
