/**
 * ResumeIQ — History Page Controller
 * Manages personal Resume Analyses & Job Match history listing, search filtering,
 * server pagination, detail modal rendering, and confirmed deletions.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!ResumeIQAuth.requireAuthOrRedirect('history.html')) {
        return;
    }

    let activeTab = 'analyses';
    let currentPage = 1;
    let currentLimit = 10;
    let totalPages = 1;
    let rawItems = [];
    let pendingDeleteId = null;
    let pendingDeleteType = null;

    const tabAnalyses = document.getElementById('tabAnalyses');
    const tabJobMatches = document.getElementById('tabJobMatches');
    const searchInput = document.getElementById('historySearchInput');
    const contentArea = document.getElementById('historyContentArea');
    const paginationSummary = document.getElementById('paginationSummary');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const toastBox = document.getElementById('historyToast');
    const toastText = document.getElementById('historyToastText');

    // Modals
    const detailModalOverlay = document.getElementById('detailModalOverlay');
    const detailModalBody = document.getElementById('detailModalBody');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

    const deleteModalOverlay = document.getElementById('deleteModalOverlay');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Parse URL params for default tab or detail ID
    const urlParams = new URLSearchParams(window.location.search);
    const paramTab = urlParams.get('tab');
    if (paramTab === 'job-matches') {
        activeTab = 'job-matches';
    }
    const paramDetailId = urlParams.get('id');

    updateTabUI();
    loadCurrentHistory();

    // Tab Listeners
    tabAnalyses.addEventListener('click', () => {
        if (activeTab !== 'analyses') {
            activeTab = 'analyses';
            currentPage = 1;
            updateTabUI();
            loadCurrentHistory();
        }
    });

    tabJobMatches.addEventListener('click', () => {
        if (activeTab !== 'job-matches') {
            activeTab = 'job-matches';
            currentPage = 1;
            updateTabUI();
            loadCurrentHistory();
        }
    });

    // Search Listener
    searchInput.addEventListener('input', () => {
        renderItems(filterItems(rawItems, searchInput.value));
    });

    // Pagination Listeners
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadCurrentHistory();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadCurrentHistory();
        }
    });

    // Modal Close Listeners
    closeDetailModalBtn.addEventListener('click', () => {
        detailModalOverlay.style.display = 'none';
    });

    detailModalOverlay.addEventListener('click', (e) => {
        if (e.target === detailModalOverlay) detailModalOverlay.style.display = 'none';
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModalOverlay.style.display = 'none';
        pendingDeleteId = null;
        pendingDeleteType = null;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteId || !pendingDeleteType) return;

        deleteModalOverlay.style.display = 'none';
        showToast('Deleting record...');

        try {
            let res;
            if (pendingDeleteType === 'analyses') {
                res = await ResumeIQApiService.deleteAnalysis(pendingDeleteId);
            } else {
                res = await ResumeIQApiService.deleteJobMatch(pendingDeleteId);
            }

            if (res && res.success) {
                showToast('Record deleted successfully.');
                loadCurrentHistory();
            } else {
                showToast(res.error?.message || 'Failed to delete record.', true);
            }
        } catch (e) {
            showToast('Network error while deleting record.', true);
        } finally {
            pendingDeleteId = null;
            pendingDeleteType = null;
        }
    });

    function updateTabUI() {
        if (activeTab === 'analyses') {
            tabAnalyses.classList.add('active');
            tabAnalyses.style.color = 'var(--primary)';
            tabAnalyses.style.borderBottomColor = 'var(--primary)';

            tabJobMatches.classList.remove('active');
            tabJobMatches.style.color = 'var(--text-muted)';
            tabJobMatches.style.borderBottomColor = 'transparent';
        } else {
            tabJobMatches.classList.add('active');
            tabJobMatches.style.color = 'var(--primary)';
            tabJobMatches.style.borderBottomColor = 'var(--primary)';

            tabAnalyses.classList.remove('active');
            tabAnalyses.style.color = 'var(--text-muted)';
            tabAnalyses.style.borderBottomColor = 'transparent';
        }
    }

    async function loadCurrentHistory() {
        contentArea.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <span class="spinner-border spinner-border-sm" style="display:inline-block; width:2rem; height:2rem; border:3px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin 0.75s linear infinite;"></span>
                <p style="margin-top: 1rem; font-size: 0.95rem;">Loading your ${activeTab === 'analyses' ? 'resume analyses' : 'job matches'}...</p>
            </div>
        `;

        try {
            let res;
            if (activeTab === 'analyses') {
                res = await ResumeIQApiService.getAnalysesHistory(currentPage, currentLimit);
            } else {
                res = await ResumeIQApiService.getJobMatchesHistory(currentPage, currentLimit);
            }

            if (res && res.success) {
                rawItems = res.data || [];
                totalPages = res.pagination?.pages || 1;
                const totalItems = res.pagination?.total || rawItems.length;

                paginationSummary.textContent = `Showing page ${currentPage} of ${totalPages} (${totalItems} total items)`;
                prevPageBtn.disabled = currentPage <= 1;
                nextPageBtn.disabled = currentPage >= totalPages;

                renderItems(filterItems(rawItems, searchInput.value));

                // Auto open detail if requested in URL parameter
                if (paramDetailId) {
                    const matchItem = rawItems.find(i => i.id === paramDetailId);
                    if (matchItem) {
                        openDetailModal(matchItem, activeTab);
                    }
                }
            } else {
                renderErrorState('Could not load history records. Server may be offline.');
            }
        } catch (err) {
            renderErrorState('Network error while fetching history.');
        }
    }

    function filterItems(items, query) {
        if (!query || !query.trim()) return items;
        const q = query.toLowerCase().trim();
        return items.filter(item => {
            const role = (item.targetRole || '').toLowerCase();
            const fileName = (item.fileName || '').toLowerCase();
            return role.includes(q) || fileName.includes(q);
        });
    }

    function renderItems(items) {
        if (!items || items.length === 0) {
            contentArea.innerHTML = `
                <div class="card" style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
                    <i class="bi bi-inbox" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5; display: block; margin-bottom: 1rem;"></i>
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
                        No ${activeTab === 'analyses' ? 'resume analyses' : 'job matches'} found
                    </h3>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">
                        ${activeTab === 'analyses' ? 'Analyze your resume to start building your history.' : 'Compare your resume against job descriptions to see matches.'}
                    </p>
                    <a href="${activeTab === 'analyses' ? 'upload.html' : 'upload.html#job-match'}" class="btn btn-primary">
                        <i class="bi bi-plus-circle"></i> ${activeTab === 'analyses' ? 'Analyze Resume' : 'Match a Job'}
                    </a>
                </div>
            `;
            return;
        }

        if (activeTab === 'analyses') {
            contentArea.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${items.map(item => renderAnalysisCard(item)).join('')}
                </div>
            `;
        } else {
            contentArea.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${items.map(item => renderJobMatchCard(item)).join('')}
                </div>
            `;
        }

        // Attach Card Button Listeners
        contentArea.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const item = rawItems.find(i => i.id === id);
                if (item) openDetailModal(item, activeTab);
            });
        });

        contentArea.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pendingDeleteId = btn.getAttribute('data-id');
                pendingDeleteType = activeTab;
                deleteModalOverlay.style.display = 'flex';
            });
        });
    }

    function renderAnalysisCard(item) {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
        const ats = item.scores?.atsScore || 70;
        const skillsMatch = item.scores?.skillsMatchPct || 70;

        let badgeClass = 'badge-success';
        if (ats < 60) badgeClass = 'badge-danger';
        else if (ats < 75) badgeClass = 'badge-warning';

        return `
            <div class="card" style="padding: 1.25rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-main);">${escapeHtml(item.targetRole || 'Software Engineer')}</span>
                        <span class="badge ${badgeClass}" style="font-weight: 700; font-size: 0.8rem;">ATS ${ats}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        <i class="bi bi-file-earmark-pdf"></i> ${escapeHtml(item.fileName || 'Resume.pdf')} (${item.fileSize || '240 KB'}) • ${dateStr}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Skills Match</div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${skillsMatch}%</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-outline btn-sm view-btn" data-id="${item.id}">
                            <i class="bi bi-eye"></i> View
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm delete-btn" data-id="${item.id}" style="color: #ef4444;" title="Delete analysis">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderJobMatchCard(item) {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
        const matchScore = item.jobMatch?.matchScore || 70;
        const reqCount = item.jobMatch?.requiredSkills?.length || 0;
        const missingCount = item.jobMatch?.missingSkills?.length || 0;

        let badgeClass = 'badge-success';
        if (matchScore < 60) badgeClass = 'badge-danger';
        else if (matchScore < 75) badgeClass = 'badge-warning';

        return `
            <div class="card" style="padding: 1.25rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-main);">${escapeHtml(item.targetRole || 'Software Engineer')}</span>
                        <span class="badge ${badgeClass}" style="font-weight: 700; font-size: 0.8rem;">Match ${matchScore}%</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        <i class="bi bi-calendar3"></i> ${dateStr}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Required Skills</div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${reqCount} Total (${missingCount} Missing)</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-outline btn-sm view-btn" data-id="${item.id}">
                            <i class="bi bi-eye"></i> View
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm delete-btn" data-id="${item.id}" style="color: #ef4444;" title="Delete match report">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function openDetailModal(item, type) {
        if (type === 'analyses') {
            detailModalBody.innerHTML = `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Resume Analysis Report</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(item.targetRole)} • ${escapeHtml(item.fileName)}</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: var(--bg-main); padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">ATS Score</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${item.scores?.atsScore || 0}</div>
                    </div>
                    <div style="background: var(--bg-main); padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Skills Match</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${item.scores?.skillsMatchPct || 0}%</div>
                    </div>
                    <div style="background: var(--bg-main); padding: 1rem; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Formatting</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #8b5cf6;">${item.scores?.formattingScore || 0}</div>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Executive Summary</h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted); background: var(--bg-main); padding: 1rem; border-radius: 8px;">${escapeHtml(item.summary || 'Summary unavailable.')}</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Skills Found</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(item.skillsFound || []).map(s => `<span class="badge badge-success" style="font-size: 0.8rem;">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-muted); font-size:0.85rem;">None</span>'}
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Missing Target Skills</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(item.skillsMissing || []).map(s => `<span class="badge badge-danger" style="font-size: 0.8rem;">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-muted); font-size:0.85rem;">None</span>'}
                    </div>
                </div>
            `;
        } else {
            const jm = item.jobMatch || {};
            detailModalBody.innerHTML = `
                <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">Job Description Match Report</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Target Role: ${escapeHtml(item.targetRole)}</p>
                </div>

                <div style="background: var(--bg-main); padding: 1.25rem; border-radius: 8px; text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Overall Match Score</div>
                    <div style="font-size: 2.25rem; font-weight: 800; color: var(--primary);">${jm.matchScore || 0}%</div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Matching Required Skills</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(jm.matchingSkills || []).map(s => `<span class="badge badge-success" style="font-size: 0.8rem;">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-muted); font-size:0.85rem;">None</span>'}
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Missing Required Skills</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(jm.missingSkills || []).map(s => `<span class="badge badge-danger" style="font-size: 0.8rem;">${escapeHtml(s)}</span>`).join('') || '<span style="color:var(--text-muted); font-size:0.85rem;">None</span>'}
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Recommendations</h4>
                    <ul style="list-style: disc; padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-muted);">
                        ${(jm.recommendations || []).map(r => `<li style="margin-bottom: 0.5rem;"><strong style="color:var(--text-main);">${escapeHtml(r.title)}:</strong> ${escapeHtml(r.desc)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        detailModalOverlay.style.display = 'flex';
    }

    function renderErrorState(msg) {
        contentArea.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
                <i class="bi bi-exclamation-triangle" style="font-size: 2.5rem; color: #ef4444; display: block; margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Failed to load history</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">${escapeHtml(msg)}</p>
                <button type="button" class="btn btn-outline" onclick="location.reload();">Try Again</button>
            </div>
        `;
    }

    function showToast(msg, isError = false) {
        toastText.textContent = msg;
        toastBox.style.background = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        toastBox.style.borderColor = isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)';
        toastBox.style.color = isError ? '#f87171' : '#10b981';
        toastBox.style.display = 'block';

        setTimeout(() => {
            toastBox.style.display = 'none';
        }, 4000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, match => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return map[match];
        });
    }
});
