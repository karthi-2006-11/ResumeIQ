/**
 * ResumeIQ — API Service Layer (Frontend-to-Backend Bridge)
 * Core Tech Stack: Pure HTML5, CSS3, Vanilla ES6 JavaScript (No Frameworks)
 *
 * Provides JWT Authentication, Health Detection, HTTP Resume Upload, Job Match, and AI Insights.
 */

const ResumeIQApiService = (() => {
    /**
     * Environment-Aware Dynamic API Base URL Resolution
     * 1. Window Global Override (window.RESUMEIQ_API_URL)
     * 2. Co-hosted Same Origin (if frontend served directly by API server on port 5000)
     * 3. Local Development Fallback (http://localhost:5000)
     * 4. Deployed Production Backend (https://resumeiq-lync.onrender.com)
     */
    function getBaseUrl() {
        if (typeof window !== 'undefined' && window.RESUMEIQ_API_URL) {
            return String(window.RESUMEIQ_API_URL).replace(/\/+$/, '');
        }
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
            if (window.location.port === '5000') {
                return window.location.origin;
            }
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:5000';
            }
        }
        return 'https://resumeiq-lync.onrender.com';
    }

    const CONFIG = {
        get baseUrl() { return getBaseUrl(); },
        apiVersion: 'v1',
        timeoutMs: 2500,
        tokenStorageKey: 'resumeIQ_token'
    };

    /**
     * Get Stored JWT Token
     */
    function getToken() {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;
        return sessionStorage.getItem(CONFIG.tokenStorageKey);
    }

    /**
     * Store JWT Token
     */
    function setToken(token) {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        if (token) {
            sessionStorage.setItem(CONFIG.tokenStorageKey, token);
        } else {
            sessionStorage.removeItem(CONFIG.tokenStorageKey);
        }
    }

    /**
     * Get Default Authorization Headers
     */
    function getAuthHeaders(extraHeaders = {}) {
        const token = getToken();
        const headers = { 'Accept': 'application/json', ...extraHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Check if ResumeIQ backend service is online and healthy
     */
    async function checkHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

            const res = await fetch(`${CONFIG.baseUrl}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                headers: getAuthHeaders()
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return data && data.success === true && data.status === 'healthy';
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    /**
     * User Registration API (`POST /api/v1/auth/register`)
     */
    async function register(email, password) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok && data.success && data.token) {
                setToken(data.token);
                return { success: true, user: data.user, token: data.token };
            } else {
                return { success: false, error: data.error?.message || 'Registration failed.' };
            }
        } catch (err) {
            return { success: false, error: `Network error: ${err.message}` };
        }
    }

    /**
     * User Login API (`POST /api/v1/auth/login`)
     */
    async function login(email, password) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok && data.success && data.token) {
                setToken(data.token);
                return { success: true, user: data.user, token: data.token };
            } else {
                return { success: false, error: data.error?.message || 'Invalid email or password.' };
            }
        } catch (err) {
            return { success: false, error: `Network error: ${err.message}` };
        }
    }

    /**
     * Fetch Current User Profile (`GET /api/v1/auth/me`)
     */
    async function getCurrentUser() {
        const token = getToken();
        if (!token) return null;

        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/auth/me`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                if (res.status === 401) setToken(null);
                return null;
            }

            const data = await res.json();
            return data.success ? data.user : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * User Logout
     */
    async function logout() {
        setToken(null);
        try {
            await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
        } catch (e) {
            // Ignore offline logout
        }
        return { success: true };
    }

    /**
     * Post Resume File to Backend Analysis or Job Match API
     */
    async function analyzeResume(file, options = {}) {
        const isHealthy = await checkHealth();
        if (!isHealthy) {
            return {
                success: false,
                error: 'Backend API service is offline. Falling back to Local Heuristic Analyzer.'
            };
        }

        try {
            const formData = new FormData();
            if (file) formData.append('file', file);
            formData.append('targetRole', options.targetRole || 'Software Engineer');

            const hasJd = options.jobDescription && options.jobDescription.trim().length >= 20;
            if (hasJd) {
                formData.append('jobDescription', options.jobDescription.trim());
            }

            const endpoint = hasJd ? 'job-match' : 'analyze';

            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/${endpoint}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.success) {
                return {
                    success: true,
                    analysis: data.analysis,
                    jobMatch: data.jobMatch,
                    persistence: data.persistence
                };
            } else {
                return {
                    success: false,
                    error: data.error?.message || 'Server analysis endpoint unavailable. Fallback active.',
                    code: data.error?.code || null,
                    quota: data.error?.quota || null
                };
            }
        } catch (err) {
            return {
                success: false,
                error: `Network error: ${err.message}. Fallback to Local Analyzer.`
            };
        }
    }

    /**
     * Request AI Qualitative Insights from Backend
     */
    async function generateAiInsights(task = 'resume-feedback', resumeContext = {}, jobMatchContext = null) {
        const isHealthy = await checkHealth();
        if (!isHealthy) {
            return {
                success: false,
                available: false,
                reason: 'Backend service offline. AI Insights unavailable.'
            };
        }

        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/ai/analyze`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    task,
                    targetRole: resumeContext.targetRole || 'Software Engineer',
                    resumeContext: {
                        summary: resumeContext.summary || '',
                        skillsFound: resumeContext.skillsFound || [],
                        skillsMissing: resumeContext.skillsMissing || []
                    },
                    jobMatchContext
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                return { success: true, ai: data.ai };
            } else {
                return {
                    success: false,
                    available: false,
                    reason: data.error?.message || 'AI request failed.'
                };
            }
        } catch (err) {
            return {
                success: false,
                available: false,
                reason: `Network error: ${err.message}`
            };
        }
    }

    /**
     * History APIs (Authenticated)
     */
    async function getAnalysesHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/analyses?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (res.status === 401) setToken(null);
            const data = await res.json();
            return res.ok && data.success ? data : { success: false, data: [] };
        } catch (err) {
            return { success: false, data: [] };
        }
    }

    async function getAnalysisById(id) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/analyses/${id}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (res.status === 401) setToken(null);
            const data = await res.json();
            return res.ok && data.success ? data : { success: false };
        } catch (err) {
            return { success: false };
        }
    }

    async function deleteAnalysis(id) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/analyses/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.status === 401) setToken(null);
            const data = await res.json();
            return res.ok && data.success ? data : { success: false };
        } catch (err) {
            return { success: false };
        }
    }

    async function getJobMatchesHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/job-matches?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (res.status === 401) setToken(null);
            const data = await res.json();
            return res.ok && data.success ? data : { success: false, data: [] };
        } catch (err) {
            return { success: false, data: [] };
        }
    }

    async function deleteJobMatch(id) {
        try {
            const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/job-matches/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.status === 401) setToken(null);
            const data = await res.json();
            return res.ok && data.success ? data : { success: false };
        } catch (err) {
            return { success: false };
        }
    }

    let inFlightUsagePromise = null;

    /**
     * Account Usage & Quota API (Authenticated)
     * Incorporates in-flight request deduplication for single-page performance.
     */
    async function getUserUsage(forceRefresh = false) {
        if (inFlightUsagePromise && !forceRefresh) {
            return inFlightUsagePromise;
        }

        inFlightUsagePromise = (async () => {
            try {
                const token = getToken();
                if (!token) return { success: false };

                const res = await fetch(`${CONFIG.baseUrl}/api/${CONFIG.apiVersion}/auth/usage`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                if (res.status === 401) setToken(null);
                const data = await res.json();
                if (res.ok && data.success) {
                    return data;
                } else {
                    return { success: false };
                }
            } catch (err) {
                return { success: false };
            } finally {
                inFlightUsagePromise = null;
            }
        })();

        return inFlightUsagePromise;
    }

    return {
        checkHealth,
        register,
        login,
        getCurrentUser,
        logout,
        getToken,
        setToken,
        analyzeResume,
        generateAiInsights,
        getAnalysesHistory,
        getAnalysisById,
        deleteAnalysis,
        getJobMatchesHistory,
        deleteJobMatch,
        getUserUsage,
        CONFIG
    };
})();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.ResumeIQApiService = ResumeIQApiService;
}
