const multer = require('multer');

// Configure Multer with MemoryStorage (files are kept in RAM buffer & never saved to disk)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB Limit
    },
    fileFilter: (req, file, cb) => {
        // Basic MIME type / extension check
        const isPdf = file.mimetype === 'application/pdf' || (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));
        if (isPdf) {
            cb(null, true);
        } else {
            const error = new Error('Please upload a valid PDF document (.pdf).');
            error.code = 'INVALID_FILE';
            error.statusCode = 400;
            cb(error, false);
        }
    }
});

// Wrapper middleware to handle Multer limit errors nicely
function handlePdfUpload(req, res, next) {
    const singleUpload = upload.single('file');

    singleUpload(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        success: false,
                        error: {
                            code: 'FILE_TOO_LARGE',
                            message: 'File size exceeds maximum allowed limit of 5 MB.'
                        }
                    });
                }
            }
            return res.status(err.statusCode || 400).json({
                success: false,
                error: {
                    code: err.code || 'INVALID_FILE',
                    message: err.message || 'File upload error.'
                }
            });
        }
        next();
    });
}

module.exports = {
    handlePdfUpload
};
