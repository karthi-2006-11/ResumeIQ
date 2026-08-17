/**
 * ResumeIQ — Analysis Dashboard Logic
 * Consumes standardized analysis results, optional Job Match payloads, and AI Insights
 */

document.addEventListener('DOMContentLoaded', () => {
    const uploadAgainBtn = document.getElementById('uploadAgainBtn');
    const printReportBtn = document.getElementById('printReportBtn');
    const targetRoleHeader = document.getElementById('targetRoleHeader');
    const fileNameHeader = document.getElementById('fileNameHeader');
    const atsScoreVal = document.getElementById('atsScoreVal');
    const scoreRing = document.getElementById('scoreRing');
    const scoreMeterAccessibility = document.getElementById('scoreMeterAccessibility');
    const atsVerdictBadge = document.getElementById('atsVerdictBadge');
    const analysisModeBadge = document.getElementById('analysisModeBadge');

    const generateAiBtn = document.getElementById('generateAiBtn');
    const aiInsightsContainer = document.getElementById('aiInsightsContainer');

    // Retrieve active analysis via Master Service Layer or URL parameter `id`
    let activeAnalysis;
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id');

    if (paramId && window.ResumeIQApiService) {
        // Fetch saved analysis from backend by ID
        window.ResumeIQApiService.getAnalysisById(paramId).then(res => {
            if (res && res.success && res.analysis) {
                activeAnalysis = res.analysis;
                activeAnalysis.mode = 'backend';
                renderAnalysisDashboard(activeAnalysis);
            }
        });
    }

    if (typeof window !== 'undefined' && window.ResumeIQAnalysisService) {
        activeAnalysis = window.ResumeIQAnalysisService.getStoredAnalysis();
    } else {
        activeAnalysis = {
            fileName: 'Sample_Software_Resume.pdf',
            fileSize: '240 KB',
            targetRole: 'Software Engineer',
            hasExtractedText: true,
            isDemo: true,
            mode: 'local',
            scores: { atsScore: 85, skillsMatchPct: 75, qualityScore: 88, formattingScore: 92 },
            skillsFound: ['HTML5', 'CSS3', 'JavaScript (ES6+)', 'Git & GitHub', 'REST APIs', 'SQL'],
            skillsMissing: ['React.js / Next.js', 'TypeScript', 'Node.js', 'Docker & CI/CD'],
            suggestions: [],
            summary: 'Your resume shows a strong structural layout.'
        };
    }

    // Render Mode Badge
    if (analysisModeBadge) {
        if (activeAnalysis.isDemo) {
            analysisModeBadge.className = 'badge badge-warning';
            analysisModeBadge.innerHTML = '<i class="bi bi-info-circle-fill" aria-hidden="true"></i> Demo Analysis Mode';
        } else if (activeAnalysis.jobMatch) {
            analysisModeBadge.className = 'badge badge-primary';
            analysisModeBadge.innerHTML = '<i class="bi bi-crosshair" aria-hidden="true"></i> Resume + Job Description Match';
        } else if (activeAnalysis.mode === 'backend') {
            analysisModeBadge.className = 'badge badge-primary';
            analysisModeBadge.innerHTML = '<i class="bi bi-cloud-check-fill" aria-hidden="true"></i> Backend Server Analysis';
        } else {
            analysisModeBadge.className = 'badge badge-success';
            analysisModeBadge.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Local Heuristic Analysis';
        }
    }

    // Populate Header Metadata
    if (targetRoleHeader) targetRoleHeader.textContent = activeAnalysis.targetRole || 'Software Engineer';
    if (fileNameHeader) fileNameHeader.textContent = `${activeAnalysis.fileName} • Target: ${activeAnalysis.targetRole}`;

    const scores = activeAnalysis.scores || { atsScore: 50, skillsMatchPct: 50, qualityScore: 50, formattingScore: 50 };

    // Render Gauges and Metric Bars
    setTimeout(() => {
        const qualityBar = document.querySelector('.fill-quality');
        const skillsBar = document.querySelector('.fill-skills');
        const formattingBar = document.querySelector('.fill-formatting');

        const qualityVal = document.getElementById('qualityScoreVal');
        const skillsVal = document.getElementById('skillsScoreVal');
        const formattingVal = document.getElementById('formattingScoreVal');

        if (qualityBar) qualityBar.style.width = scores.qualityScore + '%';
        if (skillsBar) skillsBar.style.width = scores.skillsMatchPct + '%';
        if (formattingBar) formattingBar.style.width = scores.formattingScore + '%';

        if (qualityVal) qualityVal.textContent = scores.qualityScore + '%';
        if (skillsVal) skillsVal.textContent = scores.skillsMatchPct + '%';
        if (formattingVal) formattingVal.textContent = scores.formattingScore + '%';

        if (scoreRing) {
            const circumference = 440;
            const offset = circumference - (scores.atsScore / 100) * circumference;
            scoreRing.style.strokeDashoffset = offset;
        }

        if (scoreMeterAccessibility) {
            scoreMeterAccessibility.setAttribute('aria-valuenow', scores.atsScore);
        }

        if (atsScoreVal) {
            let current = 0;
            const targetScore = scores.atsScore;
            const scoreInterval = setInterval(() => {
                current += 1;
                atsScoreVal.textContent = current + '%';
                if (current >= targetScore) {
                    clearInterval(scoreInterval);
                    atsScoreVal.textContent = targetScore + '%';
                }
            }, 15);
        }

        if (atsVerdictBadge) {
            if (scores.atsScore >= 80) {
                atsVerdictBadge.textContent = 'High ATS Match';
                atsVerdictBadge.className = 'ats-verdict';
            } else if (scores.atsScore >= 65) {
                atsVerdictBadge.textContent = 'Moderate ATS Match';
                atsVerdictBadge.className = 'ats-verdict';
                atsVerdictBadge.style.backgroundColor = 'var(--warning-light)';
                atsVerdictBadge.style.color = '#d97706';
            } else {
                atsVerdictBadge.textContent = 'Needs Keyword Optimization';
                atsVerdictBadge.className = 'ats-verdict';
                atsVerdictBadge.style.backgroundColor = 'var(--danger-light)';
                atsVerdictBadge.style.color = 'var(--danger)';
            }
        }
    }, 150);

    // Render Scanned PDF Warning Banner if detected
    if (activeAnalysis.scannedPdfLikely) {
        const warningContainer = document.createElement('div');
        warningContainer.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;';
        warningContainer.innerHTML = `<i class="bi bi-exclamation-triangle-fill" style="font-size: 1.5rem;"></i> <div><strong>Scanned / Image-Based PDF Detected:</strong> Your resume appears to contain image text or scanned content. Standard ATS scanners cannot read scanned text cleanly. Convert your document to a text-selectable PDF for accurate analysis.</div>`;
        const mainGrid = document.querySelector('.dashboard-grid');
        if (mainGrid && mainGrid.parentNode) {
            mainGrid.parentNode.insertBefore(warningContainer, mainGrid);
        }
    }

    // Populate Dynamic Lists & Text
    renderSkillsList('foundSkillsContainer', activeAnalysis.skillsFound || [], 'skill-tag-found', '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>');
    renderSkillsList('missingSkillsContainer', activeAnalysis.skillsMissing || [], 'skill-tag-missing', '<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>');
    renderSummaryText(activeAnalysis.summary || 'Summary unavailable.');
    renderSuggestionsList(activeAnalysis.suggestions || []);

    // Render Bullet Quality & Experience Intelligence Card if Version 2.0 stats present
    if (activeAnalysis.experienceStats) {
        renderExperienceStatsCard(activeAnalysis.experienceStats);
    }

    // Render Job Match Section if present
    if (activeAnalysis.jobMatch) {
        renderJobMatchSection(activeAnalysis.jobMatch);
    }

    // Render Phase 18 Resume Improvement Assistant
    const improvementData = activeAnalysis.improvements || (window.ResumeIQImprovement ? window.ResumeIQImprovement.generateImprovementPlan(activeAnalysis, activeAnalysis.targetRole, activeAnalysis.jobMatch) : null);
    if (improvementData) {
        renderImprovementSection(improvementData);
    }

    // AI Insights Opt-In Trigger Handler
    if (generateAiBtn) {
        generateAiBtn.addEventListener('click', async () => {
            generateAiBtn.disabled = true;
            generateAiBtn.innerHTML = '<i class="bi bi-hourglass-split spin" aria-hidden="true"></i> Generating AI Insights...';

            if (window.ResumeIQApiService) {
                const response = await window.ResumeIQApiService.generateAiInsights(
                    activeAnalysis.jobMatch ? 'job-match-explanation' : 'resume-feedback',
                    activeAnalysis,
                    activeAnalysis.jobMatch
                );

                if (response.success && response.ai && response.ai.insights) {
                    renderAiInsightsCard(response.ai.insights);
                } else {
                    if (aiInsightsContainer) {
                        aiInsightsContainer.style.display = 'block';
                        aiInsightsContainer.innerHTML = `
                            <div class="summary-card" style="border: 1px solid var(--warning); background: #fffbeb;">
                                <h4 style="color: #d97706; margin-top: 0;"><i class="bi bi-info-circle-fill"></i> AI Insights Notice</h4>
                                <p style="margin: 0; font-size: 0.9rem;">${escapeHTML(response.reason || 'AI processing is currently offline. Your deterministic analysis remains 100% active.')}</p>
                            </div>
                        `;
                    }
                }
            }

            generateAiBtn.disabled = false;
            generateAiBtn.innerHTML = '<i class="bi bi-stars" aria-hidden="true"></i> Refresh AI Insights';
        });
    }

    function renderAiInsightsCard(insights) {
        if (!aiInsightsContainer) return;
        aiInsightsContainer.style.display = 'block';

        const summaryStrengths = (insights.summaryFeedback?.strengths || []).map(s => `<li><i class="bi bi-check-circle-fill" style="color: var(--success);"></i> ${escapeHTML(s)}</li>`).join('');
        const summaryImprovements = (insights.summaryFeedback?.improvements || []).map(i => `<li><i class="bi bi-arrow-right-circle-fill" style="color: var(--primary);"></i> ${escapeHTML(i)}</li>`).join('');

        const recs = (insights.priorityRecommendations || []).map(r => `
            <div style="background: white; padding: 0.875rem; border-radius: var(--radius-md); border-left: 4px solid ${r.priority === 'high' ? 'var(--danger)' : r.priority === 'medium' ? '#d97706' : 'var(--primary)'}; margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="font-weight: 700; font-size: 0.9rem;">${escapeHTML(r.title)}</span>
                    <span class="badge ${r.priority === 'high' ? 'badge-danger' : r.priority === 'medium' ? 'badge-warning' : 'badge-primary'}" style="text-transform: uppercase; font-size: 0.7rem;">${escapeHTML(r.priority)} priority</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--slate-600);">${escapeHTML(r.action)}</div>
            </div>
        `).join('');

        aiInsightsContainer.innerHTML = `
            <div class="summary-card" style="border: 2px solid var(--primary-light); background: #f0fdf4; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span class="badge badge-success"><i class="bi bi-stars"></i> Qualitative AI Enhancement</span>
                    <span style="font-size: 0.75rem; color: var(--slate-500);">Server-Side AI Advisory</span>
                </div>
                <h3 style="margin-top: 0; font-size: 1.25rem;"><i class="bi bi-lightbulb-fill" style="color: var(--success);"></i> AI Executive Feedback</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <h4 style="font-size: 0.875rem; color: var(--success-hover); margin-bottom: 0.5rem;">Key Strengths</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.4rem;">
                            ${summaryStrengths || '<li>Clear structural alignment</li>'}
                        </ul>
                    </div>
                    <div>
                        <h4 style="font-size: 0.875rem; color: var(--primary); margin-bottom: 0.5rem;">Recommended Enhancements</h4>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.4rem;">
                            ${summaryImprovements || '<li>Incorporate quantifiable project metrics</li>'}
                        </ul>
                    </div>
                </div>

                ${recs ? `<h4 style="font-size: 0.875rem; color: var(--slate-800); margin-bottom: 0.5rem;">Prioritized Action Plan</h4><div>${recs}</div>` : ''}
            </div>
        `;
    }

    // Render Helpers
    function renderSkillsList(containerId, skillsArray, tagClass, iconSvg) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!skillsArray || skillsArray.length === 0) {
            container.innerHTML = '<span class="skill-tag" style="background: var(--slate-100); color: var(--slate-600);">None detected</span>';
            return;
        }

        container.innerHTML = skillsArray.map(skill => `
            <span class="skill-tag ${tagClass}">
                ${iconSvg} ${escapeHTML(skill)}
            </span>
        `).join('');
    }

    function renderSummaryText(text) {
        const summaryTextEl = document.getElementById('summaryTextEl');
        if (summaryTextEl) summaryTextEl.textContent = text;
    }

    function renderSuggestionsList(suggestionsArray) {
        const container = document.getElementById('suggestionsContainer');
        if (!container) return;

        if (!suggestionsArray || suggestionsArray.length === 0) {
            container.innerHTML = '<p style="color: var(--slate-500); font-size: 0.9rem;">Your resume meets key criteria for this role!</p>';
            return;
        }

        container.innerHTML = suggestionsArray.map(item => `
            <div class="suggestion-item">
                <div class="suggestion-icon" aria-hidden="true"><i class="bi bi-lightbulb-fill"></i></div>
                <div>
                    <div class="suggestion-title">${escapeHTML(item.title)}</div>
                    <div class="suggestion-desc">${escapeHTML(item.desc)}</div>
                </div>
            </div>
        `).join('');
    }

    function renderJobMatchSection(jobMatchData) {
        const container = document.getElementById('jobMatchSectionContainer');
        if (!container) return;

        container.style.display = 'block';
        const matchScore = jobMatchData.matchScore || 75;
        const sub = jobMatchData.scores || {};

        container.innerHTML = `
            <div class="summary-card" style="border: 2px solid var(--primary-light); background: #f8fafc; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <span class="badge badge-primary" style="margin-bottom: 0.5rem;"><i class="bi bi-crosshair"></i> Job Match Analysis</span>
                        <h2 style="margin: 0; font-size: 1.5rem;"><i class="bi bi-bullseye" style="color: var(--primary);"></i> Resume-to-Job Match: <span style="color: var(--primary); font-weight: 800;">${matchScore}%</span></h2>
                    </div>
                    <div class="badge ${matchScore >= 80 ? 'badge-success' : matchScore >= 65 ? 'badge-warning' : 'badge-danger'}" style="font-size: 0.9rem; padding: 0.5rem 1rem;">
                        ${matchScore >= 80 ? 'Strong Match' : matchScore >= 65 ? 'Partial Match' : 'High Keyword Gap'}
                    </div>
                </div>

                <p style="color: var(--slate-600); font-size: 0.95rem; margin-bottom: 1.5rem;">${escapeHTML(jobMatchData.summary || '')}</p>

                <!-- Sub-score Breakdown Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: white; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Required Skills (40%)</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">${sub.requiredSkills || 70}%</div>
                    </div>
                    <div style="background: white; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Preferred Skills (15%)</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: var(--success);">${sub.preferredSkills || 70}%</div>
                    </div>
                    <div style="background: white; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Keyword Match (20%)</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: #d97706;">${sub.keywords || 70}%</div>
                    </div>
                    <div style="background: white; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Role Relevance (15%)</div>
                        <div style="font-size: 1.4rem; font-weight: 800; color: var(--slate-800);">${sub.roleRelevance || 75}%</div>
                    </div>
                </div>

                <!-- Job Description Matching vs Missing Skills -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    <div>
                        <h4 style="font-size: 0.9rem; color: var(--success-hover); margin-bottom: 0.5rem;"><i class="bi bi-check-circle-fill" style="color: var(--success);"></i> Matched JD Skills</h4>
                        <div class="skills-tags-list">
                            ${(jobMatchData.matchingSkills || []).map(s => `<span class="skill-tag skill-tag-found"><i class="bi bi-check-lg"></i> ${escapeHTML(s)}</span>`).join('')}
                        </div>
                    </div>
                    <div>
                        <h4 style="font-size: 0.9rem; color: var(--danger); margin-bottom: 0.5rem;"><i class="bi bi-exclamation-triangle-fill" style="color: var(--danger);"></i> Missing JD Skills</h4>
                        <div class="skills-tags-list">
                            ${(jobMatchData.missingSkills || []).length > 0
                                ? (jobMatchData.missingSkills || []).map(s => `<span class="skill-tag skill-tag-missing"><i class="bi bi-x-lg"></i> ${escapeHTML(s)}</span>`).join('')
                                : '<span class="skill-tag" style="background: var(--success-light); color: var(--success-hover);">All key skills matched!</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderImprovementSection(data) {
        const container = document.getElementById('improvementSectionContainer');
        if (!container || !data) return;

        container.style.display = 'block';

        const strengthsHtml = (data.strengths || []).length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.95rem; color: var(--success); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="bi bi-shield-check"></i> Verified Strengths
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.75rem;">
                    ${(data.strengths || []).map(s => `
                        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.75rem 1rem; border-radius: var(--radius-md);">
                            <div style="font-weight: 700; color: #047857; font-size: 0.875rem;"><i class="bi bi-check-circle-fill"></i> ${escapeHTML(s.title)}</div>
                            <div style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.25rem;">${escapeHTML(s.description)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const actionPlanHtml = (data.actionPlan || []).length > 0 ? `
            <div style="margin-bottom: 1.5rem; background: #f8fafc; border: 1px solid var(--slate-200); padding: 1rem 1.25rem; border-radius: var(--radius-md);">
                <h4 style="font-size: 0.95rem; color: var(--slate-800); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="bi bi-list-check"></i> Prioritized Action Plan
                </h4>
                <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem; color: var(--slate-700); line-height: 1.6;">
                    ${(data.actionPlan || []).map(item => `<li>${escapeHTML(item)}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        const rewritesHtml = (data.rewriteSuggestions || []).length > 0 ? `
            <div>
                <h4 style="font-size: 0.95rem; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="bi bi-pencil-square"></i> Safe Non-Fabricating Rewrite Suggestions
                </h4>
                <div style="display: flex; flex-direction: column; gap: 0.875rem;">
                    ${(data.rewriteSuggestions || []).map(r => `
                        <div class="rewrite-card" id="${escapeHTML(r.id)}" style="background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span class="badge" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); font-size: 0.75rem; text-transform: uppercase;">Section: ${escapeHTML(r.section)}</span>
                                <span class="badge" style="background: #f1f5f9; color: var(--slate-600); font-size: 0.75rem;">Confidence: ${escapeHTML(r.confidence || 'high')}</span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;"><strong>Original:</strong></div>
                            <div style="font-size: 0.85rem; color: var(--slate-700); background: #f8fafc; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; border-left: 3px solid var(--slate-400);">${escapeHTML(r.original)}</div>
                            <div style="font-size: 0.8rem; color: var(--success); margin-bottom: 0.25rem;"><strong>Suggested Rewrite:</strong></div>
                            <div style="font-size: 0.875rem; font-weight: 600; color: var(--slate-900); background: rgba(16, 185, 129, 0.05); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.75rem; border-left: 3px solid var(--success);">${escapeHTML(r.suggestion)}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.785rem; color: var(--slate-500);">
                                <span><i class="bi bi-info-circle"></i> ${escapeHTML(r.reason)}</span>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button type="button" class="btn btn-outline btn-sm copy-rewrite-btn" data-text="${escapeHTML(r.suggestion)}" aria-label="Copy suggested rewrite to clipboard">
                                        <i class="bi bi-clipboard"></i> Copy Suggestion
                                    </button>
                                    <button type="button" class="btn btn-outline btn-sm dismiss-rewrite-btn" data-target="${escapeHTML(r.id)}" aria-label="Dismiss this suggestion">
                                        <i class="bi bi-x-lg"></i> Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="summary-card" style="background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-900); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="bi bi-lightbulb-fill" style="color: #f59e0b;"></i> Resume Improvement Assistant (v18.0)
                        </h3>
                        <p style="color: var(--slate-600); font-size: 0.875rem; margin: 0.25rem 0 0 0;">Actionable, non-fabricating guidance derived from Resume Intelligence signals.</p>
                    </div>
                    <span class="badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706; font-weight: 700; font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                        Overall Priority: ${(data.overallPriority || 'medium').toUpperCase()}
                    </span>
                </div>

                ${strengthsHtml}
                ${actionPlanHtml}
                ${rewritesHtml}
            </div>
        `;

        // Event listener delegation for Copy Suggestion buttons
        container.querySelectorAll('.copy-rewrite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const textToCopy = btn.getAttribute('data-text');
                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const origHtml = btn.innerHTML;
                        btn.innerHTML = '<i class="bi bi-check2"></i> Copied to clipboard!';
                        btn.style.color = 'var(--success)';
                        setTimeout(() => {
                            btn.innerHTML = origHtml;
                            btn.style.color = '';
                        }, 2000);
                    }).catch(err => {
                        console.error('Clipboard copy failed:', err);
                    });
                }
            });
        });

        // Event listener delegation for Dismiss buttons
        container.querySelectorAll('.dismiss-rewrite-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                if (targetId) {
                    const card = document.getElementById(targetId);
                    if (card) {
                        card.style.transition = 'opacity 0.3s ease';
                        card.style.opacity = '0';
                        setTimeout(() => card.remove(), 300);
                    }
                }
            });
        });
    }

    function renderExperienceStatsCard(stats) {
        const rightCol = document.querySelector('.analysis-details-column');
        if (!rightCol) return;

        const card = document.createElement('div');
        card.className = 'summary-card';
        card.style.marginTop = '1.5rem';
        card.innerHTML = `
            <div class="card-header-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--primary);">
                <i class="bi bi-bar-chart-line-fill"></i>
            </div>
            <h3 class="card-title">Bullet Quality & Experience Intelligence</h3>
            <p style="color: var(--slate-600); font-size: 0.9rem; margin-bottom: 1.25rem;">Deterministic structural analysis of your experience bullet points and metrics.</p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.875rem; text-align: center;">
                <div style="background: #f8fafc; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                    <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Action Verbs</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: var(--primary);">${stats.actionVerbsCount || 0}</div>
                </div>
                <div style="background: #f8fafc; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                    <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Metrics & Data</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: var(--success);">${stats.quantificationCount || 0}</div>
                </div>
                <div style="background: #f8fafc; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                    <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Strong Bullets</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: #8b5cf6;">${stats.strongBullets || 0}</div>
                </div>
                <div style="background: #f8fafc; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
                    <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Passive Phrases</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: ${stats.passivePhrasesCount > 1 ? 'var(--danger)' : 'var(--slate-800)'};">${stats.passivePhrasesCount || 0}</div>
                </div>
            </div>
        `;

        rightCol.appendChild(card);
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    if (uploadAgainBtn) {
        uploadAgainBtn.addEventListener('click', () => {
            window.location.href = 'upload.html';
        });
    }

    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => {
            window.print();
        });
    }
});