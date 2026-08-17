/**
 * ResumeIQ — Loading / Analysis Sequence Logic
 * Drives progress bar, checklist item progression, accessible aria updates, and navigation to analysis.html
 */

document.addEventListener('DOMContentLoaded', () => {
    const progressFill = document.getElementById('progressFill');
    const progressTrack = document.getElementById('progressTrack');
    const statusText = document.getElementById('statusText');
    const contextPill = document.getElementById('contextPill');
    const contextFileName = document.getElementById('contextFileName');
    const contextRoleName = document.getElementById('contextRoleName');

    // Retrieve stored context if available
    try {
        const storedRaw = sessionStorage.getItem('resumeIQ_data');
        if (storedRaw) {
            const data = JSON.parse(storedRaw);
            if (contextFileName) contextFileName.textContent = data.fileName || 'Resume.pdf';
            if (contextRoleName) contextRoleName.textContent = data.targetRole || 'Software Engineer';
            if (contextPill) contextPill.style.display = 'inline-flex';
        }
    } catch (e) {
        console.warn('Session storage read skipped:', e);
    }

    // 5 Analysis Sequence Steps
    const steps = [
        { label: "Parsing PDF Document Structure...", pct: 20 },
        { label: "Extracting Skills & Technical Experience...", pct: 40 },
        { label: "Checking ATS Scanner Compatibility...", pct: 60 },
        { label: "Evaluating Keyword Match & Formatting...", pct: 80 },
        { label: "Generating Smart Actionable Report...", pct: 100 }
    ];

    let currentStepIndex = 0;

    // Update active checklist step UI & ARIA states
    function updateStepUI(index) {
        for (let i = 0; i < 5; i++) {
            const item = document.getElementById(`step-${i}`);
            if (!item) continue;

            const checkIcon = item.querySelector('.check-icon');

            if (i < index) {
                item.className = 'check-item is-done';
                if (checkIcon) checkIcon.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';
            } else if (i === index) {
                item.className = 'check-item is-active';
                if (checkIcon) checkIcon.innerHTML = '<i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>';
            } else {
                item.className = 'check-item';
                if (checkIcon) checkIcon.innerHTML = '';
            }
        }
    }

    updateStepUI(0);

    const timer = setInterval(() => {
        currentStepIndex++;

        if (currentStepIndex < steps.length) {
            const step = steps[currentStepIndex];
            if (progressFill) progressFill.style.width = step.pct + '%';
            if (progressTrack) progressTrack.setAttribute('aria-valuenow', step.pct);
            if (statusText) statusText.textContent = step.label;
            updateStepUI(currentStepIndex);
        } else {
            clearInterval(timer);
            // Complete all checklist items
            updateStepUI(5);
            if (progressFill) progressFill.style.width = '100%';
            if (progressTrack) progressTrack.setAttribute('aria-valuenow', 100);
            if (statusText) statusText.textContent = 'Report Complete! Redirecting to dashboard...';

            setTimeout(() => {
                window.location.href = 'analysis.html';
            }, 600);
        }
    }, 700);
});