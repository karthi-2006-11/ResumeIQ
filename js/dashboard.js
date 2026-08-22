/**
 * ResumeIQ — Dashboard Logic
 * Fetches user profile, calculates real activity statistics, and renders recent analysis and job match items.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Enforce Authentication Guard
    if (!ResumeIQAuth.requireAuthOrRedirect('dashboard.html')) {
        return;
    }

    const emailSpan = document.getElementById('userEmailSpan');
    const statAnalysisCount = document.getElementById('statAnalysisCount');
    const statAvgAts = document.getElementById('statAvgAts');
    const statJobMatchCount = document.getElementById('statJobMatchCount');
    const statAvgJobMatch = document.getElementById('statAvgJobMatch');
    const recentAnalysesList = document.getElementById('recentAnalysesList');
    const recentJobMatchesList = document.getElementById('recentJobMatchesList');

    // 2. Load User Profile & Usage
    const user = await ResumeIQAuth.getCurrentUser();
    if (user && emailSpan) {
        emailSpan.textContent = user.email;
    }

    // Load Account Usage & Quotas
    try {
        const usageRes = await ResumeIQApiService.getUserUsage();
        if (usageRes && usageRes.success && usageRes.usage) {
            const u = usageRes.usage;
            const tierBadge = document.getElementById('usageTierBadge');
            const resetText = document.getElementById('usageResetText');
            const analysisText = document.getElementById('usageAnalysisText');
            const analysisBar = document.getElementById('usageAnalysisBar');
            const analysisSub = document.getElementById('usageAnalysisSub');
            const jobMatchText = document.getElementById('usageJobMatchText');
            const jobMatchBar = document.getElementById('usageJobMatchBar');
            const jobMatchSub = document.getElementById('usageJobMatchSub');

            const isPro = (u.tier || 'free').toLowerCase() === 'pro';
            if (tierBadge) {
                tierBadge.textContent = `${(u.tier || 'free').toUpperCase()} PLAN`;
                tierBadge.className = isPro ? 'badge badge-success' : 'badge badge-primary';
            }
            const dashUpgradeBtn = document.getElementById('upgradeProBtn');
            if (dashUpgradeBtn) {
                dashUpgradeBtn.style.display = isPro ? 'none' : 'inline-flex';
            }
            if (resetText && u.resetDate) {
                const rDate = new Date(u.resetDate);
                resetText.textContent = `Resets on ${rDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
            }

            if (u.analysis) {
                const used = u.analysis.used || 0;
                const limit = u.analysis.limit || 10;
                const pct = Math.min(100, Math.round((used / limit) * 100));
                if (analysisText) analysisText.textContent = `${used} / ${limit}`;
                if (analysisBar) analysisBar.style.width = `${pct}%`;
                if (analysisSub) analysisSub.textContent = `${u.analysis.remaining} remaining this month`;
            }

            if (u.jobMatch) {
                const used = u.jobMatch.used || 0;
                const limit = u.jobMatch.limit || 5;
                const pct = Math.min(100, Math.round((used / limit) * 100));
                if (jobMatchText) jobMatchText.textContent = `${used} / ${limit}`;
                if (jobMatchBar) jobMatchBar.style.width = `${pct}%`;
                if (jobMatchSub) jobMatchSub.textContent = `${u.jobMatch.remaining} remaining this month`;
            }
        }
    } catch (uErr) {
        console.warn('[Dashboard] Usage data could not be loaded:', uErr);
    }

    // 3. Fetch Analyses & Job Matches
    try {
        const [analysesRes, matchesRes] = await Promise.all([
            ResumeIQApiService.getAnalysesHistory(1, 10),
            ResumeIQApiService.getJobMatchesHistory(1, 10)
        ]);

        const analyses = (analysesRes && analysesRes.success) ? (analysesRes.data || []) : [];
        const matches = (matchesRes && matchesRes.success) ? (matchesRes.data || []) : [];

        // 4. Calculate Stats
        const totalAnalyses = analysesRes.pagination?.total || analyses.length;
        const totalMatches = matchesRes.pagination?.total || matches.length;

        statAnalysisCount.textContent = totalAnalyses;
        statJobMatchCount.textContent = totalMatches;

        if (analyses.length > 0) {
            const sumAts = analyses.reduce((acc, item) => acc + (item.scores?.atsScore || 0), 0);
            const avgAts = Math.round(sumAts / analyses.length);
            statAvgAts.textContent = `${avgAts}%`;
        } else {
            statAvgAts.textContent = '--';
        }

        if (matches.length > 0) {
            const sumMatch = matches.reduce((acc, item) => acc + (item.jobMatch?.matchScore || 0), 0);
            const avgMatch = Math.round(sumMatch / matches.length);
            statAvgJobMatch.textContent = `${avgMatch}%`;
        } else {
            statAvgJobMatch.textContent = '--';
        }

        // 5. Render Recent Resume Analyses
        if (analyses.length === 0) {
            recentAnalysesList.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
                    <i class="bi bi-file-earmark-x" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p style="font-weight: 500; margin-bottom: 0.75rem;">No resume analyses yet</p>
                    <a href="upload.html" class="btn btn-primary btn-sm">Analyze Resume</a>
                </div>
            `;
        } else {
            const recentAnalyses = analyses.slice(0, 3);
            recentAnalysesList.innerHTML = recentAnalyses.map(item => {
                const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                const score = item.scores?.atsScore || 70;
                let badgeClass = 'badge-success';
                if (score < 60) badgeClass = 'badge-danger';
                else if (score < 75) badgeClass = 'badge-warning';

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 0; border-bottom: 1px solid var(--border-color);">
                        <div>
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(item.targetRole || 'Software Engineer')}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(item.fileName || 'Resume.pdf')} • ${dateStr}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span class="badge ${badgeClass}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; font-weight: 700;">ATS ${score}</span>
                            <a href="analysis.html?id=${item.id}" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">View</a>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 6. Render Recent Job Matches
        if (matches.length === 0) {
            recentJobMatchesList.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
                    <i class="bi bi-briefcase" style="font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p style="font-weight: 500; margin-bottom: 0.75rem;">No job matches yet</p>
                    <a href="upload.html#job-match" class="btn btn-outline btn-sm">Match a Job</a>
                </div>
            `;
        } else {
            const recentMatches = matches.slice(0, 3);
            recentJobMatchesList.innerHTML = recentMatches.map(item => {
                const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                const score = item.jobMatch?.matchScore || 70;
                let badgeClass = 'badge-success';
                if (score < 60) badgeClass = 'badge-danger';
                else if (score < 75) badgeClass = 'badge-warning';

                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 0; border-bottom: 1px solid var(--border-color);">
                        <div>
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${escapeHtml(item.targetRole || 'Software Engineer')}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span class="badge ${badgeClass}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; font-weight: 700;">Match ${score}%</span>
                            <a href="history.html?tab=job-matches&id=${item.id}" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">View</a>
                        </div>
                    </div>
                `;
            }).join('');
        }

    } catch (err) {
        console.error('[Dashboard] Error loading data:', err);
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return map[match];
    });
}
