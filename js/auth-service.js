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
            authActionBox.innerHTML = `
                <div class="user-pill-dropdown">
                    <a href="dashboard.html" class="btn btn-outline btn-sm" title="Logged in as ${userEmail}">
                        <i class="bi bi-person-circle" aria-hidden="true"></i>
                        <span class="user-email-text">${userEmail}</span>
                    </a>
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
        } else {
            authActionBox.innerHTML = `
                <a href="login.html" class="btn btn-outline btn-sm">Login</a>
                <a href="register.html" class="btn btn-primary btn-sm">Create Account</a>
            `;
        }
    }

    // Initialize Header on DOMContentLoaded
    if (typeof window !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            updateHeaderNav();
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
        updateHeaderNav
    };
})();

if (typeof window !== 'undefined') {
    window.ResumeIQAuth = ResumeIQAuth;
}
