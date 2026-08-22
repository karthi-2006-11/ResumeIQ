/**
 * ResumeIQ — Centralized Frontend Authentication Service
 * Core Tech Stack: Pure HTML5, CSS3, Vanilla ES6 JavaScript (No Frameworks)
 *
 * Manages Auth state, Session storage, Login/Register forms, User profile, Logout,
 * and Header Navigation rendering for both Authenticated and Anonymous users.
 */

const ResumeIQAuth = (() => {
    /**
     * Get Stored Auth Token
     */
    function getToken() {
        return window.ResumeIQApiService ? window.ResumeIQApiService.getToken() : sessionStorage.getItem('resumeIQ_token');
    }

    /**
     * Check if user is currently authenticated (token exists)
     */
    function isAuthenticated() {
        return !!getToken();
    }

    /**
     * Clear active user authentication state
     */
    function clearSession() {
        if (window.ResumeIQApiService) {
            window.ResumeIQApiService.setToken(null);
        } else {
            sessionStorage.removeItem('resumeIQ_token');
        }
        sessionStorage.removeItem('resumeIQ_user_cache');
    }

    /**
     * Cache user object locally for fast header display
     */
    function setCachedUser(user) {
        if (!user) {
            sessionStorage.removeItem('resumeIQ_user_cache');
            return;
        }
        sessionStorage.setItem('resumeIQ_user_cache', JSON.stringify({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        }));
    }

    /**
     * Get Cached User Object
     */
    function getCachedUser() {
        try {
            const raw = sessionStorage.getItem('resumeIQ_user_cache');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * User Registration (`POST /api/v1/auth/register`)
     */
    async function register(email, password) {
        if (!window.ResumeIQApiService) {
            return { success: false, error: 'API service unavailable.' };
        }
        const result = await window.ResumeIQApiService.register(email, password);
        if (result.success && result.user) {
            setCachedUser(result.user);
        }
        return result;
    }

    /**
     * User Login (`POST /api/v1/auth/login`)
     */
    async function login(email, password) {
        if (!window.ResumeIQApiService) {
            return { success: false, error: 'API service unavailable.' };
        }
        const result = await window.ResumeIQApiService.login(email, password);
        if (result.success && result.user) {
            setCachedUser(result.user);
        }
        return result;
    }

    /**
     * Fetch Current User Profile (`GET /api/v1/auth/me`)
     */
    async function getCurrentUser() {
        if (!isAuthenticated()) return null;
        if (!window.ResumeIQApiService) return getCachedUser();

        const user = await window.ResumeIQApiService.getCurrentUser();
        if (user) {
            setCachedUser(user);
            return user;
        } else {
            clearSession();
            return null;
        }
    }

    /**
     * User Logout
     */
    async function logout() {
        if (window.ResumeIQApiService) {
            await window.ResumeIQApiService.logout();
        }
        clearSession();
        window.location.href = 'index.html';
    }

    /**
     * Guard protected pages — Redirect to login.html if unauthenticated
     */
    function requireAuthOrRedirect(returnUrl = null) {
        if (!isAuthenticated()) {
            const redirectParam = returnUrl || window.location.pathname.split('/').pop();
            window.location.href = `login.html?redirect=${encodeURIComponent(redirectParam)}`;
            return false;
        }
        return true;
    }

    /**
     * Synchronize Header Navigation UI based on Auth State
     */
    async function updateHeaderNav() {
        const navMenu = document.getElementById('navMenu');
        const navActions = document.querySelector('.nav-actions');

        if (!navActions) return;

        const isAuth = isAuthenticated();
        let user = getCachedUser();

        if (isAuth && !user && window.ResumeIQApiService) {
            user = await getCurrentUser();
        }

        // 1. Update Navigation Links in navMenu if present
        if (navMenu) {
            let authLinks = navMenu.querySelector('.auth-nav-links');
            if (!authLinks) {
                authLinks = document.createElement('div');
                authLinks.className = 'auth-nav-links';
                navMenu.appendChild(authLinks);
            }

            if (isAuth) {
                authLinks.innerHTML = `
                    <a class="nav-link ${window.location.pathname.includes('dashboard.html') ? 'active' : ''}" href="dashboard.html">
                        <i class="bi bi-grid-fill" aria-hidden="true"></i> Dashboard
                    </a>
                    <a class="nav-link ${window.location.pathname.includes('history.html') ? 'active' : ''}" href="history.html">
                        <i class="bi bi-clock-history" aria-hidden="true"></i> History
                    </a>
                `;
            } else {
                authLinks.innerHTML = ``;
            }
        }

        // 2. Update Nav Actions area
        let authActionBox = navActions.querySelector('.auth-action-box');
        if (!authActionBox) {
            authActionBox = document.createElement('div');
            authActionBox.className = 'auth-action-box';
            // Insert before mobile toggle if present
            const mobileToggle = navActions.querySelector('.mobile-toggle');
            if (mobileToggle) {
                navActions.insertBefore(authActionBox, mobileToggle);
            } else {
                navActions.appendChild(authActionBox);
            }
        }

        if (isAuth) {
            const userEmail = user ? user.email : 'My Account';
            const safeEmail = escapeHTML(userEmail);

            authActionBox.innerHTML = `
                <div class="user-pill-dropdown">
                    <a href="dashboard.html" class="btn btn-outline btn-sm" title="Logged in as ${safeEmail}">
                        <i class="bi bi-person-circle" aria-hidden="true"></i>
                        <span class="user-email-text">${safeEmail}</span>
                    </a>
                    <button type="button" class="btn btn-outline btn-sm" id="headerSettingsBtn" title="Account Settings">
                        <i class="bi bi-gear-fill" aria-hidden="true"></i> Settings
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" id="headerLogoutBtn" title="Log out of ResumeIQ">
                        <i class="bi bi-box-arrow-right" aria-hidden="true"></i> Logout
                    </button>
                </div>
            `;

            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }

            const settingsBtn = document.getElementById('headerSettingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openAccountSettingsModal();
                });
            }

            // Asynchronously pre-fetch user usage to prime cache for settings modal & quota guards
            if (window.ResumeIQApiService) {
                window.ResumeIQApiService.getUserUsage().catch(err => {
                    console.warn('[HeaderNav] Usage load skipped:', err);
                });
            }
        } else {
            authActionBox.innerHTML = `
                <a href="login.html" class="btn btn-outline btn-sm">Login</a>
                <a href="register.html" class="btn btn-primary btn-sm">Create Account</a>
            `;
        }
    }

    /**
     * Open Account Settings Modal (Phase 24C)
     */
    async function openAccountSettingsModal() {
        let modal = document.getElementById('accountSettingsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'accountSettingsModal';
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-labelledby', 'modalTitle');
            modal.setAttribute('aria-modal', 'true');
            document.body.appendChild(modal);
        }

        let user = getCachedUser();
        if (!user && window.ResumeIQApiService) {
            user = await getCurrentUser();
        }

        let usage = null;
        if (window.ResumeIQApiService) {
            const usageRes = await window.ResumeIQApiService.getUserUsage();
            if (usageRes && usageRes.success) {
                usage = usageRes.usage;
            }
        }

        const safeEmail = escapeHTML(user ? user.email : 'N/A');
        const userTier = usage ? (usage.tier || 'free').toLowerCase() : 'free';
        const isProTier = userTier === 'pro';
        const tierLabel = usage ? `${userTier.toUpperCase()} PLAN` : 'FREE PLAN';
        const tierBadgeClass = isProTier ? 'badge badge-success' : 'badge badge-primary';

        let memberSince = 'N/A';
        if (user && user.createdAt) {
            try {
                memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            } catch (e) {
                memberSince = 'N/A';
            }
        }

        let resetDateStr = 'the 1st of next month';
        if (usage && usage.resetDate) {
            try {
                resetDateStr = new Date(usage.resetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            } catch (e) {
                resetDateStr = usage.resetDate;
            }
        }

        const analysisUsed = usage && usage.analysis ? usage.analysis.used : 0;
        const analysisLimit = usage && usage.analysis ? usage.analysis.limit : 10;
        const analysisRemaining = usage && usage.analysis ? usage.analysis.remaining : (analysisLimit - analysisUsed);

        const matchUsed = usage && usage.jobMatch ? usage.jobMatch.used : 0;
        const matchLimit = usage && usage.jobMatch ? usage.jobMatch.limit : 5;
        const matchRemaining = usage && usage.jobMatch ? usage.jobMatch.remaining : (matchLimit - matchUsed);

        modal.innerHTML = `
            <div class="settings-modal-card">
                <div class="settings-modal-header">
                    <h2 class="settings-modal-title" id="modalTitle">
                        <i class="bi bi-gear-fill" style="color: var(--primary);" aria-hidden="true"></i> Account Settings
                    </h2>
                    <button type="button" class="settings-modal-close" id="modalCloseBtn" aria-label="Close settings">
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="settings-modal-body">
                    <div class="settings-section-title">Account Profile</div>
                    <div class="settings-row">
                        <span class="settings-label">Email Address</span>
                        <span class="settings-value">${safeEmail}</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Subscription Tier</span>
                        <span class="settings-value" style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="${tierBadgeClass}">${tierLabel}</span>
                            ${isProTier ? '' : `<button type="button" class="btn btn-outline btn-sm" id="settingsUpgradeBtn" style="font-size: 0.75rem; padding: 0.15rem 0.5rem;"><i class="bi bi-star-fill" style="color: #f59e0b;" aria-hidden="true"></i> Upgrade</button>`}
                        </span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Member Since</span>
                        <span class="settings-value">${memberSince}</span>
                    </div>

                    <div class="settings-section-title" style="margin-top: 1.25rem;">Monthly Usage & Quotas</div>
                    <div class="settings-row">
                        <span class="settings-label">Resume Analyses</span>
                        <span class="settings-value">${analysisUsed} / ${analysisLimit} used (${analysisRemaining} remaining)</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Job Matches</span>
                        <span class="settings-value">${matchUsed} / ${matchLimit} used (${matchRemaining} remaining)</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Quota Reset Date</span>
                        <span class="settings-value">${resetDateStr}</span>
                    </div>
                </div>
                <div class="settings-modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm" id="modalLogoutBtn">
                        <i class="bi bi-box-arrow-right" aria-hidden="true"></i> Logout
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" id="modalDoneBtn">Done</button>
                </div>
            </div>
        `;

        // Event Handlers for Closing Modal
        const closeBtn = document.getElementById('modalCloseBtn');
        const doneBtn = document.getElementById('modalDoneBtn');
        const logoutModalBtn = document.getElementById('modalLogoutBtn');
        const settingsUpgradeBtn = document.getElementById('settingsUpgradeBtn');

        if (closeBtn) closeBtn.addEventListener('click', closeAccountSettingsModal);
        if (doneBtn) doneBtn.addEventListener('click', closeAccountSettingsModal);
        if (logoutModalBtn) {
            logoutModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeAccountSettingsModal();
                logout();
            });
        }

        if (settingsUpgradeBtn) {
            settingsUpgradeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeAccountSettingsModal();
                openProUpgradeModal();
            });
        }

        // Close on Backdrop Click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAccountSettingsModal();
            }
        });

        // Close on Escape key press
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                closeAccountSettingsModal();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);

        // Show Modal & Prevent Body Scroll
        modal.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Open Pro Plan Upgrade Information Modal (Phase 25B)
     */
    function openProUpgradeModal() {
        let modal = document.getElementById('proUpgradeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'proUpgradeModal';
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-labelledby', 'proModalTitle');
            modal.setAttribute('aria-modal', 'true');
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="settings-modal-card">
                <div class="settings-modal-header" style="background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(139,92,246,0.06)); border-bottom: 1px solid var(--border-color);">
                    <h2 class="settings-modal-title" id="proModalTitle" style="color: var(--primary);">
                        <i class="bi bi-star-fill" style="color: #f59e0b;" aria-hidden="true"></i> ResumeIQ Pro Plan
                    </h2>
                    <button type="button" class="settings-modal-close" id="proModalCloseBtn" aria-label="Close modal">
                        <i class="bi bi-x-lg" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="settings-modal-body">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <span class="badge badge-warning" style="font-size: 0.825rem; padding: 0.35rem 0.75rem;">
                            <i class="bi bi-info-circle-fill" aria-hidden="true"></i> Self-Service Payments Coming Soon
                        </span>
                    </div>

                    <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; margin-bottom: 1.25rem; text-align: center;">
                        Upgrade to <strong>ResumeIQ Pro</strong> to unlock expanded monthly limits, priority AI processing, and advanced optimization tools.
                    </p>

                    <div class="settings-section-title">Pro Plan Benefits</div>
                    <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0; line-height: 2;">
                        <li style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem;">
                            <i class="bi bi-check-circle-fill" style="color: var(--success);" aria-hidden="true"></i>
                            <span><strong>100 Resume Analyses / month</strong> (vs 10 on Free)</span>
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem;">
                            <i class="bi bi-check-circle-fill" style="color: var(--success);" aria-hidden="true"></i>
                            <span><strong>50 Job Description Matches / month</strong> (vs 5 on Free)</span>
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem;">
                            <i class="bi bi-clock-history" style="color: var(--primary);" aria-hidden="true"></i>
                            <span><strong>Priority AI Insights & Qualitative Feedback</strong> <em style="font-size: 0.785rem; color: var(--text-muted);">(Planned Pro Feature)</em></span>
                        </li>
                        <li style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.9rem;">
                            <i class="bi bi-clock-history" style="color: var(--primary);" aria-hidden="true"></i>
                            <span><strong>Extended Analysis History Retention</strong> <em style="font-size: 0.785rem; color: var(--text-muted);">(Planned Pro Feature)</em></span>
                        </li>
                    </ul>

                    <div style="font-size: 0.8rem; color: var(--text-muted); background: #f8fafc; padding: 0.75rem 1rem; border-radius: var(--radius-sm); border: 1px solid #e2e8f0;">
                        <i class="bi bi-shield-lock" aria-hidden="true"></i> Live payment gateway integration (Stripe) will be available in an upcoming release. Enterprise testing accounts can be upgraded by system administrators.
                    </div>
                </div>
                <div class="settings-modal-footer">
                    <button type="button" class="btn btn-primary btn-sm" id="proModalGotItBtn">Got It</button>
                </div>
            </div>
        `;

        const closeBtn = document.getElementById('proModalCloseBtn');
        const gotItBtn = document.getElementById('proModalGotItBtn');

        function closeProModal() {
            modal.classList.remove('is-visible');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', closeProModal);
        if (gotItBtn) gotItBtn.addEventListener('click', closeProModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeProModal();
        });

        modal.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close Account Settings Modal
     */
    function closeAccountSettingsModal() {
        const modal = document.getElementById('accountSettingsModal');
        if (modal) {
            modal.classList.remove('is-visible');
        }
        document.body.style.overflow = '';
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    // Initialize Header on DOMContentLoaded
    if (typeof window !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            updateHeaderNav();

            // Handle Dashboard Upgrade to Pro button if present
            const dashUpgradeBtn = document.getElementById('upgradeProBtn');
            if (dashUpgradeBtn) {
                dashUpgradeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    openProUpgradeModal();
                });
            }
        });
    }

    return {
        getToken,
        isAuthenticated,
        clearSession,
        register,
        login,
        getCurrentUser,
        logout,
        requireAuthOrRedirect,
        updateHeaderNav,
        openProUpgradeModal
    };
})();

if (typeof window !== 'undefined') {
    window.ResumeIQAuth = ResumeIQAuth;
}
