/**
 * ResumeIQ — Universal App Script
 * Handles mobile navbar toggle, keyboard Escape close, outside click close, and scroll elevation
 * Pure Vanilla JavaScript (No Frameworks)
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    const appHeader = document.querySelector('.app-header');

    if (mobileToggle && navMenu) {
        const closeMenu = () => {
            mobileToggle.classList.remove('is-active');
            navMenu.classList.remove('is-active');
            mobileToggle.setAttribute('aria-expanded', 'false');
        };

        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = mobileToggle.classList.toggle('is-active');
            navMenu.classList.toggle('is-active');
            mobileToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        // Close menu when clicking any navigation link
        const navLinks = navMenu.querySelectorAll('.nav-link, a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('is-active')) {
                closeMenu();
                mobileToggle.focus();
            }
        });

        // Close menu when clicking outside header
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('is-active') && appHeader && !appHeader.contains(e.target)) {
                closeMenu();
            }
        });
    }

    // Header Background Elevation on Scroll
    if (appHeader) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                appHeader.style.boxShadow = '0 10px 30px rgba(15, 23, 42, 0.08)';
            } else {
                appHeader.style.boxShadow = 'none';
            }
        });
    }
});
