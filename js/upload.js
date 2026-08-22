/**
 * ResumeIQ — Upload Page Logic & PDF Text Extraction Service Integration
 * Manages PDF drag & drop, file size limits, job role selection, optional job description, and analysis service invocation
 */

document.addEventListener('DOMContentLoaded', () => {
    const browseBtn = document.getElementById('browseBtn');
    const resumeInput = document.getElementById('resumeInput');
    const uploadDropzone = document.getElementById('uploadDropzone');
    const filePreviewArea = document.getElementById('filePreviewArea');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const jobRoleSelect = document.getElementById('jobRoleSelect');
    const jobDescriptionInput = document.getElementById('jobDescriptionInput');
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit
    let selectedFile = null;

    // Configure PDF.js worker CDN
    if (typeof window !== 'undefined' && window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Trigger file dialog from Browse button
    if (browseBtn && resumeInput) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resumeInput.click();
        });
    }

    // Dropzone click & keyboard triggers (Enter / Space)
    if (uploadDropzone) {
        uploadDropzone.addEventListener('click', () => {
            if (resumeInput) resumeInput.click();
        });

        uploadDropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (resumeInput) resumeInput.click();
            }
        });
    }

    // Input Change Handler
    if (resumeInput) {
        resumeInput.addEventListener('change', () => {
            if (resumeInput.files.length > 0) {
                handleFileSelection(resumeInput.files[0]);
            }
        });
    }

    // Drag and Drop Handlers
    if (uploadDropzone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadDropzone.addEventListener(eventName, () => {
                uploadDropzone.classList.add('is-dragging');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadDropzone.addEventListener(eventName, () => {
                uploadDropzone.classList.remove('is-dragging');
            });
        });

        uploadDropzone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelection(file);
            }
        });
    }

    // Fetch and cache user account usage metrics on load
    let cachedUsage = null;
    if (typeof window !== 'undefined' && window.ResumeIQApiService) {
        window.ResumeIQApiService.getUserUsage().then(res => {
            if (res && res.success && res.usage) {
                cachedUsage = res.usage;
                if (selectedFile) {
                    checkQuotaLimits();
                }
            }
        }).catch(err => {
            console.warn('[Upload] Failed to load usage metrics:', err);
        });
    }

    function formatResetDateStr(isoStr) {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return isoStr;
        }
    }

    function checkQuotaLimits() {
        if (!cachedUsage) return false;

        const tier = (cachedUsage.tier || 'free').toUpperCase();
        const resetStr = formatResetDateStr(cachedUsage.resetDate);
        const hasJd = jobDescriptionInput && jobDescriptionInput.value.trim().length >= 20;

        // 1. Check Analysis Quota
        if (cachedUsage.analysis && cachedUsage.analysis.used >= cachedUsage.analysis.limit) {
            showError(`Monthly resume analysis quota of ${cachedUsage.analysis.limit} reached for your ${tier} plan. Limits reset on ${resetStr || 'the 1st of next month'}.`);
            if (analyzeBtn) analyzeBtn.disabled = true;
            return true; // Quota exceeded
        }

        // 2. Check Job Match Quota (if Job Description provided)
        if (hasJd && cachedUsage.jobMatch && cachedUsage.jobMatch.used >= cachedUsage.jobMatch.limit) {
            showError(`Monthly job match quota of ${cachedUsage.jobMatch.limit} reached for your ${tier} plan. Limits reset on ${resetStr || 'the 1st of next month'}.`);
            if (analyzeBtn) analyzeBtn.disabled = true;
            return true; // Quota exceeded
        }

        hideError();
        if (analyzeBtn && selectedFile) analyzeBtn.disabled = false;
        return false;
    }

    // Monitor Job Description Input for Real-Time Quota Pre-Check
    if (jobDescriptionInput) {
        jobDescriptionInput.addEventListener('input', () => {
            if (selectedFile) {
                checkQuotaLimits();
            }
        });
    }

    // Process selected file with validation
    function handleFileSelection(file) {
        hideError();

        // 1. Zero-Byte File Guard
        if (!file || file.size === 0) {
            showError('The uploaded file is empty (0 bytes). Please attach a valid PDF document.');
            clearFile();
            return;
        }

        // 2. PDF Extension / Type Check
        const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdfType) {
            showError('Invalid file type. Please upload a PDF document (.pdf).');
            clearFile();
            return;
        }

        // 3. File Size Check (Max 5MB)
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            showError(`File size exceeds 5MB limit. Selected file is ${fileSizeMB} MB.`);
            clearFile();
            return;
        }

        selectedFile = file;
        renderFilePreview(file);

        if (!checkQuotaLimits() && analyzeBtn) {
            analyzeBtn.disabled = false;
        }
    }

    // Render Preview Component
    function renderFilePreview(file) {
        const sizeFormatted = (file.size / 1024).toFixed(1) + ' KB';

        if (filePreviewArea) {
            filePreviewArea.innerHTML = `
                <div class="file-preview-card">
                    <div class="file-details">
                        <div class="file-icon" aria-hidden="true"><i class="bi bi-file-earmark-pdf-fill"></i></div>
                        <div>
                            <div class="file-name">${escapeHTML(file.name)}</div>
                            <div class="file-meta">${sizeFormatted} • PDF Document</div>
                        </div>
                    </div>
                    <button type="button" class="remove-file-btn" id="removeFileBtn" title="Remove file" aria-label="Remove file ${escapeHTML(file.name)}">
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>
            `;

            const removeBtn = document.getElementById('removeFileBtn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    clearFile();
                });
            }
        }
    }

    // Clear File State & Storage
    function clearFile() {
        selectedFile = null;
        if (resumeInput) resumeInput.value = '';
        if (filePreviewArea) filePreviewArea.innerHTML = '';
        if (analyzeBtn) analyzeBtn.disabled = true;

        try {
            sessionStorage.removeItem('resumeIQ_data');
            sessionStorage.removeItem('resumeIQ_analysis');
        } catch (e) {
            console.warn('Session storage remove skipped:', e);
        }
    }

    // Error Messaging Helpers
    function showError(msg) {
        if (errorMessage) errorMessage.textContent = msg;
        if (errorBanner) errorBanner.classList.add('is-visible');
    }

    function hideError() {
        if (errorBanner) errorBanner.classList.remove('is-visible');
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    /* --------------------------------------------------------------------------
       Browser PDF Text Extraction via PDF.js
       -------------------------------------------------------------------------- */
    async function extractTextFromPDF(file) {
        if (!window.pdfjsLib) {
            console.warn('PDF.js library not detected. Skipping text extraction.');
            return '';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            return fullText;
        } catch (err) {
            console.warn('PDF text extraction exception:', err);
            return '';
        }
    }

    // Analyze Button Listener — Extract text, invoke Analysis Service, & navigate
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            if (checkQuotaLimits()) {
                return;
            }

            // UI Loading Feedback on Button
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="bi bi-hourglass-split spin" aria-hidden="true"></i> Parsing & Analyzing PDF...';

            const targetRole = jobRoleSelect ? jobRoleSelect.value : 'Software Engineer';
            const jobDescription = jobDescriptionInput ? jobDescriptionInput.value.trim() : '';

            try {
                // Extract PDF Text
                const extractedText = await extractTextFromPDF(selectedFile);

                // Execute Master Analysis Service Layer (with optional Job Description)
                let result = null;
                if (window.ResumeIQAnalysisService) {
                    result = await window.ResumeIQAnalysisService.analyze(selectedFile, extractedText, {
                        targetRole: targetRole,
                        jobDescription: jobDescription,
                        mode: 'auto'
                    });
                }

                if (result && result.success === false) {
                    showError(result.error || 'The uploaded file was rejected. Please select a valid PDF resume.');
                    return;
                }

                // Redirect to loading animation page
                window.location.href = 'loading.html';
            } catch (err) {
                console.error('[Upload] Analysis invocation exception:', err);
                showError(`An unexpected error occurred: ${err.message || 'Analysis failed.'}. Please try again.`);
            } finally {
                // Reset button state if redirection didn't happen (i.e. error or rejection)
                if (analyzeBtn && window.location.pathname.indexOf('loading.html') === -1) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="bi bi-cpu-fill" aria-hidden="true"></i> Analyze Resume';
                }
            }
        });
    }
});