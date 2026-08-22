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

    // Open Optimization Workspace Handler
    const openWorkspaceBtn = document.getElementById('openWorkspaceBtn');
    if (openWorkspaceBtn) {
        openWorkspaceBtn.addEventListener('click', () => {
            if (window.ResumeIQWorkspace) {
                const draft = window.ResumeIQWorkspace.getDraft(activeAnalysis);
                renderOptimizationWorkspaceUI(draft);
                const container = document.getElementById('optimizationWorkspaceContainer');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    function renderOptimizationWorkspaceUI(draft) {
        const container = document.getElementById('optimizationWorkspaceContainer');
        if (!container || !draft) return;

        container.style.display = 'block';

        const origAts = draft.originalAnalysis.scores.atsScore;
        const origSkills = draft.originalAnalysis.scores.skillsMatchPct;
        const origQuality = draft.originalAnalysis.scores.qualityScore;
        const origJobMatch = draft.originalAnalysis.jobMatchScore;

        const opt = draft.optimizedAnalysis;
        const diffs = opt ? opt.diffs : null;

        const formatDiffBadge = (diffVal) => {
            if (diffVal === null || diffVal === undefined) return '<span style="color: var(--slate-400);">--</span>';
            if (diffVal > 0) return `<span class="badge badge-success">+${diffVal}%</span>`;
            if (diffVal < 0) return `<span class="badge" style="background: var(--danger-light); color: var(--danger);">${diffVal}%</span>`;
            return '<span class="badge" style="background: #f1f5f9; color: var(--slate-600);">0%</span>';
        };

        const comparisonHtml = `
            <div style="background: #f8fafc; border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.95rem; color: var(--slate-900); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="bi bi-arrows-collapse"></i> Deterministic Before vs After Score Comparison</span>
                    <span style="font-size: 0.75rem; font-weight: 500; color: var(--slate-500);">Source: Engine v2.0</span>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; text-align: center;">
                    <div style="background: white; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">ATS Score</div>
                        <div style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0.25rem 0;">${origAts}% ${opt ? `➔ ${opt.scores.atsScore}%` : ''}</div>
                        <div>${diffs ? formatDiffBadge(diffs.atsScore) : '<span style="font-size: 0.75rem; color: var(--slate-400);">Click Re-analyze</span>'}</div>
                    </div>
                    <div style="background: white; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Skills Match</div>
                        <div style="font-size: 1.2rem; font-weight: 800; color: var(--primary); margin: 0.25rem 0;">${origSkills}% ${opt ? `➔ ${opt.scores.skillsMatchPct}%` : ''}</div>
                        <div>${diffs ? formatDiffBadge(diffs.skillsMatchPct) : '<span style="font-size: 0.75rem; color: var(--slate-400);">Click Re-analyze</span>'}</div>
                    </div>
                    <div style="background: white; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Quality Score</div>
                        <div style="font-size: 1.2rem; font-weight: 800; color: var(--success); margin: 0.25rem 0;">${origQuality}% ${opt ? `➔ ${opt.scores.qualityScore}%` : ''}</div>
                        <div>${diffs ? formatDiffBadge(diffs.qualityScore) : '<span style="font-size: 0.75rem; color: var(--slate-400);">Click Re-analyze</span>'}</div>
                    </div>
                    ${origJobMatch !== null ? `
                    <div style="background: white; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                        <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 600;">Job Match</div>
                        <div style="font-size: 1.2rem; font-weight: 800; color: #8b5cf6; margin: 0.25rem 0;">${origJobMatch}% ${opt && opt.jobMatch ? `➔ ${opt.jobMatch.matchScore}%` : ''}</div>
                        <div>${diffs ? formatDiffBadge(diffs.jobMatchScore) : '<span style="font-size: 0.75rem; color: var(--slate-400);">Click Re-analyze</span>'}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        const bullets = draft.experience.length > 0 ? draft.experience[0].bullets : [];

        container.innerHTML = `
            <div class="summary-card" style="background: white; border: 1px solid var(--slate-200); border-radius: var(--radius-lg); padding: 1.75rem; box-shadow: var(--shadow-sm);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--slate-200);">
                    <div>
                        <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--slate-900); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="bi bi-sliders" style="color: var(--primary);"></i> Resume Optimization Workspace (Phase 19)
                        </h3>
                        <p style="color: var(--slate-600); font-size: 0.875rem; margin: 0.25rem 0 0 0;">Safe interactive drafting. Original uploaded resume remains read-only & immutable.</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-primary btn-sm" id="reanalyzeDraftBtn">
                            <i class="bi bi-cpu"></i> Re-analyze Optimized Draft
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" id="undoDraftBtn">
                            <i class="bi bi-arrow-counterclockwise"></i> Undo
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" id="resetDraftBtn" style="color: var(--danger);">
                            <i class="bi bi-arrow-circle-left"></i> Reset
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" id="exportDraftBtn">
                            <i class="bi bi-printer"></i> Print / Export
                        </button>
                    </div>
                </div>

                ${comparisonHtml}

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                    <div>
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.75rem;"><i class="bi bi-pencil"></i> Professional Summary Draft</h4>
                        <textarea id="draftSummaryInput" rows="4" style="width: 100%; border: 1px solid var(--slate-300); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.875rem; color: var(--slate-900);">${escapeHTML(draft.summary || '')}</textarea>

                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin: 1.25rem 0 0.75rem;"><i class="bi bi-tags"></i> Technical Skills Draft (Comma Separated)</h4>
                        <input type="text" id="draftSkillsInput" value="${escapeHTML((draft.skills || []).join(', '))}" style="width: 100%; border: 1px solid var(--slate-300); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.875rem; color: var(--slate-900);" />
                    </div>

                    <div>
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.75rem;"><i class="bi bi-list-task"></i> Experience Bullet Points</h4>
                        <div id="draftBulletsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${bullets.map((b, idx) => `
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="text" class="draft-bullet-input" data-index="${idx}" value="${escapeHTML(b)}" style="flex: 1; border: 1px solid var(--slate-300); border-radius: var(--radius-sm); padding: 0.5rem; font-size: 0.85rem;" />
                                    <button type="button" class="btn btn-outline btn-sm delete-bullet-btn" data-index="${idx}" style="color: var(--danger); padding: 0.4rem 0.6rem;"><i class="bi bi-trash"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn-outline btn-sm" id="addBulletBtn" style="margin-top: 0.75rem;">
                            <i class="bi bi-plus-lg"></i> Add Experience Bullet
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Event listener wiring inside workspace UI
        const reanalyzeBtn = container.querySelector('#reanalyzeDraftBtn');
        if (reanalyzeBtn) {
            reanalyzeBtn.addEventListener('click', () => {
                // Update draft text values from form inputs first
                const sumInput = container.querySelector('#draftSummaryInput');
                const skillsInput = container.querySelector('#draftSkillsInput');
                if (sumInput) draft.summary = sumInput.value.trim();
                if (skillsInput) draft.skills = skillsInput.value.split(',').map(s => s.trim()).filter(Boolean);

                const bulletInputs = container.querySelectorAll('.draft-bullet-input');
                if (draft.experience.length > 0) {
                    draft.experience[0].bullets = Array.from(bulletInputs).map(i => i.value.trim()).filter(Boolean);
                }

                const updated = window.ResumeIQWorkspace.reanalyzeDraft(draft, activeAnalysis);
                renderOptimizationWorkspaceUI(updated);
            });
        }

        const undoBtn = container.querySelector('#undoDraftBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                const restored = window.ResumeIQWorkspace.undo(draft);
                renderOptimizationWorkspaceUI(restored);
            });
        }

        const resetBtn = container.querySelector('#resetDraftBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset your optimized draft? All uncommitted edits in this session will be reverted to initial state.')) {
                    const fresh = window.ResumeIQWorkspace.reset(activeAnalysis);
                    renderOptimizationWorkspaceUI(fresh);
                }
            });
        }

        const exportBtn = container.querySelector('#exportDraftBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const printable = document.getElementById('printableOptimizedResume');
                if (printable && window.ResumeIQWorkspace) {
                    const cleanText = window.ResumeIQWorkspace.convertDraftToText(draft);
                    printable.innerHTML = `
                        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; padding: 20px;">
                            <h1 style="margin: 0 0 5px 0; font-size: 24px;">${escapeHTML(draft.contact.name || 'Candidate Name')}</h1>
                            <p style="margin: 0 0 15px 0; font-size: 13px; color: #444;">
                                ${escapeHTML(draft.contact.email)} | ${escapeHTML(draft.contact.phone)} | ${escapeHTML(draft.contact.linkedin || '')}
                            </p>
                            <hr style="border: none; border-top: 1px solid #ccc; margin-bottom: 15px;" />
                            <h3 style="font-size: 16px; margin: 15px 0 5px 0; text-transform: uppercase;">Professional Summary</h3>
                            <p style="font-size: 13px; margin: 0 0 15px 0;">${escapeHTML(draft.summary)}</p>
                            <h3 style="font-size: 16px; margin: 15px 0 5px 0; text-transform: uppercase;">Technical Skills</h3>
                            <p style="font-size: 13px; margin: 0 0 15px 0;">${escapeHTML((draft.skills || []).join(', '))}</p>
                            <h3 style="font-size: 16px; margin: 15px 0 5px 0; text-transform: uppercase;">Work Experience</h3>
                            ${(draft.experience[0]?.bullets || []).map(b => `<p style="font-size: 13px; margin: 3px 0;">• ${escapeHTML(b)}</p>`).join('')}
                        </div>
                    `;
                    window.print();
                }
            });
        }

        const addBulletBtn = container.querySelector('#addBulletBtn');
        if (addBulletBtn) {
            addBulletBtn.addEventListener('click', () => {
                if (draft.experience.length > 0) {
                    draft.experience[0].bullets.push('Added new experience accomplishment bullet.');
                    window.ResumeIQWorkspace.saveDraft(draft);
                    renderOptimizationWorkspaceUI(draft);
                }
            });
        }

        container.querySelectorAll('.delete-bullet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (draft.experience.length > 0 && !isNaN(idx)) {
                    draft.experience[0].bullets.splice(idx, 1);
                    window.ResumeIQWorkspace.saveDraft(draft);
                    renderOptimizationWorkspaceUI(draft);
                }
            });
        });
    }

    // Guest Conversion CTA Banner Toggle (Phase 25A)
    const guestBanner = document.getElementById('guestConversionBanner');
    if (guestBanner) {
        const isAuth = typeof ResumeIQAuth !== 'undefined' && typeof ResumeIQAuth.isAuthenticated === 'function'
            ? ResumeIQAuth.isAuthenticated()
            : false;
        guestBanner.style.display = !isAuth ? 'flex' : 'none';
    }

    if (uploadAgainBtn) {
        uploadAgainBtn.addEventListener('click', () => {
            window.location.href = 'upload.html';
        });
    }

    // Print / Export PDF Handler (Phase 25A)
    if (printReportBtn) {
        printReportBtn.addEventListener('click', () => {
            const printableContainer = document.getElementById('printableOptimizedResume');
            if (printableContainer && (!printableContainer.innerHTML || printableContainer.innerHTML.trim() === '')) {
                const scores = activeAnalysis?.scores || {};
                printableContainer.innerHTML = `
                    <div style="font-family: system-ui, sans-serif; padding: 1rem; color: #0f172a;">
                        <h1 style="font-size: 1.75rem; color: #2563eb; margin-bottom: 0.5rem;">ResumeIQ Analysis Report</h1>
                        <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem;">
                            File: <strong>${escapeHTML(activeAnalysis?.fileName || 'Resume.pdf')}</strong> |
                            Target Role: <strong>${escapeHTML(activeAnalysis?.targetRole || 'Software Engineer')}</strong> |
                            Date: <strong>${new Date().toLocaleDateString()}</strong>
                        </p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 1.5rem;">

                        <h2 style="font-size: 1.25rem;">ATS Overview</h2>
                        <ul style="line-height: 1.8;">
                            <li><strong>ATS Overall Score:</strong> ${scores.atsScore || 0}%</li>
                            <li><strong>Resume Quality:</strong> ${scores.qualityScore || 0}%</li>
                            <li><strong>Skills Match:</strong> ${scores.skillsMatchPct || 0}%</li>
                            <li><strong>Formatting Audit:</strong> ${scores.formattingScore || 0}%</li>
                        </ul>

                        <h2 style="font-size: 1.25rem; margin-top: 1.5rem;">Skills Audit</h2>
                        <p><strong>Found:</strong> ${escapeHTML((activeAnalysis?.skillsFound || []).join(', ') || 'None')}</p>
                        <p><strong>Missing Priority:</strong> ${escapeHTML((activeAnalysis?.skillsMissing || []).join(', ') || 'None')}</p>

                        <h2 style="font-size: 1.25rem; margin-top: 1.5rem;">Executive Summary</h2>
                        <p style="line-height: 1.6;">${escapeHTML(activeAnalysis?.summary || 'Resume analysis completed.')}</p>
                    </div>
                `;
            }
            window.print();
        });
    }

    // Download Markdown Report Handler (Phase 25A)
    const downloadMdBtn = document.getElementById('downloadMdBtn');
    if (downloadMdBtn) {
        downloadMdBtn.addEventListener('click', () => {
            if (!activeAnalysis) return;

            const scores = activeAnalysis.scores || {};
            const fileName = activeAnalysis.fileName || 'Resume.pdf';
            const targetRole = activeAnalysis.targetRole || 'Software Engineer';
            const dateStr = activeAnalysis.metadata?.analyzedAt
                ? new Date(activeAnalysis.metadata.analyzedAt).toLocaleDateString()
                : new Date().toLocaleDateString();

            const skillsFound = (activeAnalysis.skillsFound || []).join(', ') || 'None detected';
            const skillsMissing = (activeAnalysis.skillsMissing || []).join(', ') || 'None detected';
            const summaryText = activeAnalysis.summary || 'Resume analysis completed.';

            let mdContent = `# ResumeIQ Analysis Report\n\n`;
            mdContent += `**File Name:** ${fileName}\n`;
            mdContent += `**Target Role:** ${targetRole}\n`;
            mdContent += `**Date:** ${dateStr}\n\n`;

            mdContent += `## Scores Summary\n\n`;
            mdContent += `- **ATS Overall Score:** ${scores.atsScore || 0}%\n`;
            mdContent += `- **Resume Quality Score:** ${scores.qualityScore || 0}%\n`;
            mdContent += `- **Skills Match Score:** ${scores.skillsMatchPct || 0}%\n`;
            mdContent += `- **Formatting Audit Score:** ${scores.formattingScore || 0}%\n\n`;

            mdContent += `## Skills Audit\n\n`;
            mdContent += `### Verified Skills Found\n${skillsFound}\n\n`;
            mdContent += `### Missing Priority Skills\n${skillsMissing}\n\n`;

            if (activeAnalysis.jobMatch) {
                const jm = activeAnalysis.jobMatch;
                mdContent += `## Job Match Results\n\n`;
                mdContent += `- **Match Score:** ${jm.matchScore || 0}%\n`;
                mdContent += `- **Matching Skills:** ${(jm.matchingSkills || []).join(', ') || 'None'}\n`;
                mdContent += `- **Missing Required Skills:** ${(jm.missingRequiredSkills || []).join(', ') || 'None'}\n\n`;
            }

            mdContent += `## Executive Summary\n\n${summaryText}\n\n`;
            mdContent += `---\n*Report generated by ResumeIQ*`;

            try {
                const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Resume_Analysis_Report_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                console.error('[Export] Download Markdown exception:', err);
                alert('Could not download Markdown report. Please copy the summary instead.');
            }
        });
    }

    // Copy Executive Summary Handler (Phase 25A)
    const copySummaryBtn = document.getElementById('copySummaryBtn');
    if (copySummaryBtn) {
        copySummaryBtn.addEventListener('click', async () => {
            if (!activeAnalysis) return;

            const scores = activeAnalysis.scores || {};
            const fileName = activeAnalysis.fileName || 'Resume.pdf';
            const targetRole = activeAnalysis.targetRole || 'Software Engineer';
            const summaryText = activeAnalysis.summary || 'Analysis completed.';

            const plainSummary = `ResumeIQ Report for ${fileName} (${targetRole})\n` +
                `ATS Score: ${scores.atsScore || 0}% | Quality: ${scores.qualityScore || 0}%\n` +
                `Skills Found: ${(activeAnalysis.skillsFound || []).join(', ')}\n` +
                `Missing Skills: ${(activeAnalysis.skillsMissing || []).join(', ')}\n` +
                `Summary: ${summaryText}`;

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(plainSummary);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = plainSummary;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }

                const origHtml = copySummaryBtn.innerHTML;
                copySummaryBtn.innerHTML = '<i class="bi bi-check2" style="color: var(--success);" aria-hidden="true"></i> Copied!';
                setTimeout(() => {
                    copySummaryBtn.innerHTML = origHtml;
                }, 2000);
            } catch (err) {
                console.error('[Export] Copy summary exception:', err);
                alert('Could not copy to clipboard. Text preview:\n\n' + plainSummary);
            }
        });
    }
});