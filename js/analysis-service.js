/**
 * ResumeIQ — Master Analysis Service Layer
 * Core Tech Stack: Pure HTML5, CSS3, Vanilla ES6 JavaScript (No Frameworks)
 *
 * Handles standardized analysis orchestration between Backend API and Local Browser Analyzer,
 * supporting both Resume Analysis and Job Description Matching.
 */

const ResumeIQAnalysisService = (() => {
    const STORAGE_KEY = 'resumeIQ_analysis';
    const LEGACY_STORAGE_KEY = 'resumeIQ_data';

    /**
     * Standardized Result Schema 1.0 Factory
     */
    function formatStandardResult(rawResult, fileObj = null, targetRole = 'Software Engineer') {
        const fileName = fileObj ? fileObj.name : (rawResult?.fileName || 'Resume.pdf');
        const fileSize = fileObj ? (fileObj.size / 1024).toFixed(1) + ' KB' : (rawResult?.fileSize || '240 KB');

        return {
            version: '1.0',
            mode: rawResult?.mode || 'local',
            fileName: fileName,
            fileSize: fileSize,
            targetRole: targetRole,
            hasExtractedText: rawResult?.hasExtractedText !== undefined ? rawResult.hasExtractedText : true,
            isDemo: rawResult?.isDemo || false,

            scores: {
                atsScore: rawResult?.scores?.atsScore || 75,
                skillsMatchPct: rawResult?.scores?.skillsMatchPct || 70,
                qualityScore: rawResult?.scores?.qualityScore || 80,
                formattingScore: rawResult?.scores?.formattingScore || 85
            },

            contactInfo: {
                hasEmail: rawResult?.contactInfo?.hasEmail || false,
                email: rawResult?.contactInfo?.email || null,
                hasPhone: rawResult?.contactInfo?.hasPhone || false,
                phone: rawResult?.contactInfo?.phone || null,
                hasLinkedin: rawResult?.contactInfo?.hasLinkedin || false,
                linkedin: rawResult?.contactInfo?.linkedin || null,
                hasGithub: rawResult?.contactInfo?.hasGithub || false,
                github: rawResult?.contactInfo?.github || null
            },

            sectionsFound: rawResult?.sectionsFound || ['summary', 'skills', 'experience', 'education'],
            skillsFound: rawResult?.skillsFound || ['HTML5', 'CSS3', 'JavaScript', 'Git'],
            skillsMissing: rawResult?.skillsMissing || ['TypeScript', 'Docker'],
            suggestions: rawResult?.suggestions || [],
            summary: rawResult?.summary || 'Resume analysis summary.',

            jobMatch: rawResult?.jobMatch || null,

            metadata: {
                wordCount: rawResult?.metadata?.wordCount || 300,
                analyzedAt: rawResult?.metadata?.analyzedAt || new Date().toISOString()
            }
        };
    }

    /**
     * Execute Resume Analysis or Job Match across available execution providers
     * @param {File} file - PDF File object
     * @param {string} extractedText - Text string extracted locally by PDF.js
     * @param {Object} options - { targetRole: string, jobDescription?: string, mode?: 'local' | 'backend' | 'auto' }
     * @returns {Promise<Object>} Standardized Result Schema 1.0
     */
    async function analyze(file, extractedText = '', options = {}) {
        const targetRole = options.targetRole || 'Software Engineer';
        const jobDescription = options.jobDescription || '';
        const requestedMode = options.mode || 'auto';

        let resultPayload = null;

        // 1. Try Server-Side Backend Analysis / Job Match if mode is 'backend' or 'auto'
        if (requestedMode === 'backend' || requestedMode === 'auto') {
            if (typeof window !== 'undefined' && window.ResumeIQApiService) {
                const isHealthy = await window.ResumeIQApiService.checkHealth();
                if (isHealthy && file) {
                    try {
                        const apiResponse = await window.ResumeIQApiService.analyzeResume(file, { targetRole, jobDescription });
                        if (apiResponse.success && apiResponse.analysis) {
                            resultPayload = apiResponse.analysis;
                            resultPayload.mode = 'backend';
                            if (apiResponse.jobMatch) {
                                resultPayload.jobMatch = apiResponse.jobMatch;
                            }
                        } else if (apiResponse.success === false) {
                            // Backend responded but rejected the upload (e.g. invalid signature, empty file, corrupted, QUOTA_EXCEEDED).
                            // Do NOT fall back to local analyzer for server-rejected files.
                            return {
                                success: false,
                                error: apiResponse.error || 'The uploaded resume was rejected by the server.',
                                code: apiResponse.code || 'UPLOAD_REJECTED',
                                quota: apiResponse.quota || null
                            };
                        }
                    } catch (err) {
                        console.warn('[AnalysisService] Backend API call failed. Falling back to Local Analyzer:', err);
                    }
                }
            }
        }

        // 2. Fallback to Local Browser Analyzer if Backend unavailable or failed
        if (!resultPayload) {
            let localResult = null;
            if (typeof window !== 'undefined' && window.ResumeIQAnalyzer) {
                localResult = window.ResumeIQAnalyzer.analyzeResumeContent(
                    extractedText,
                    targetRole,
                    file ? file.name : 'Resume.pdf',
                    file ? (file.size / 1024).toFixed(1) + ' KB' : '240 KB'
                );

                // Local Job Match Fallback if jobDescription provided
                if (jobDescription && jobDescription.trim().length >= 20) {
                    const localMatch = window.ResumeIQAnalyzer.analyzeJobMatchContent(extractedText, jobDescription, targetRole);
                    localResult.jobMatch = localMatch;
                }
            }

            resultPayload = formatStandardResult(localResult, file, targetRole);
            resultPayload.mode = 'local';
        }

        // 3. Persist Analysis Result to sessionStorage
        saveStoredAnalysis(resultPayload);

        return resultPayload;
    }

    /**
     * Save Standardized Analysis Payload to sessionStorage
     */
    function saveStoredAnalysis(payload) {
        if (typeof window === 'undefined' || !window.sessionStorage) return;

        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

            // Legacy backward compatibility payload
            const legacyPayload = {
                fileName: payload.fileName,
                fileSize: payload.fileSize,
                targetRole: payload.targetRole,
                extractedText: '',
                score: payload.scores.atsScore,
                uploadTime: payload.metadata.analyzedAt
            };
            sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyPayload));
        } catch (err) {
            console.warn('[AnalysisService] Failed to write analysis result to sessionStorage:', err);
        }
    }

    /**
     * Retrieve Stored Analysis Payload from sessionStorage
     */
    function getStoredAnalysis() {
        if (typeof window === 'undefined' || !window.sessionStorage) {
            return formatStandardResult({ isDemo: true });
        }

        try {
            const jsonStr = sessionStorage.getItem(STORAGE_KEY);
            if (jsonStr) {
                return JSON.parse(jsonStr);
            }
        } catch (err) {
            console.warn('[AnalysisService] Failed to read analysis result from sessionStorage:', err);
        }

        // Demo Fallback Mode
        return formatStandardResult({
            isDemo: true,
            fileName: 'Sample_Software_Resume.pdf',
            fileSize: '240 KB',
            targetRole: 'Software Engineer',
            scores: { atsScore: 85, skillsMatchPct: 75, qualityScore: 88, formattingScore: 92 },
            skillsFound: ['HTML5', 'CSS3', 'JavaScript (ES6+)', 'Git & GitHub', 'REST APIs', 'SQL'],
            skillsMissing: ['React.js / Next.js', 'TypeScript', 'Node.js', 'Docker & CI/CD'],
            summary: 'Demo Mode: Upload a PDF resume to receive a real-time personalized analysis report.'
        });
    }

    return {
        analyze,
        getStoredAnalysis,
        saveStoredAnalysis,
        formatStandardResult
    };
})();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.ResumeIQAnalysisService = ResumeIQAnalysisService;
}
