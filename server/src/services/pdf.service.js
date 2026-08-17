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
    // 1. Signature Check
    if (!isValidPdfBuffer(buffer)) {
        const error = new Error('File signature check failed. The uploaded file is not a valid PDF document.');
        error.code = 'INVALID_FILE';
        error.statusCode = 400;
        throw error;
    }

    // 2. Parse PDF via pdf-parse passing typed array for buffer alignment
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
        const error = new Error('Unable to extract text from PDF document. The file may be corrupted or password protected.');
        error.code = 'PDF_EXTRACTION_FAILED';
        error.statusCode = 422;
        throw error;
    }
}

module.exports = {
    isValidPdfBuffer,
    parsePdfBuffer
};
