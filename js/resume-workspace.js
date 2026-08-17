/**
 * ResumeIQ — Phase 19 Resume Optimization Workspace & Client-Side Drafting Engine
 * Core Tech Stack: Pure HTML5, CSS3, Vanilla ES6 JavaScript (No Frameworks)
 *
 * Implements read-only original resume separation, structured draft state,
 * pending/accepted/edited/dismissed suggestion workflows, undo/reset,
 * deterministic re-analysis via ResumeIQAnalyzer, and honest before/after score comparison.
 */

const ResumeIQWorkspace = (() => {
    const WORKSPACE_KEY = 'resumeIQ_draft_workspace';
    const MAX_UNDO_STACK = 20;

    let undoStack = [];

    /**
     * Helper to safely format original text from analysis object
     */
    function buildInitialDraft(originalAnalysis) {
        if (!originalAnalysis) return null;

        const contact = originalAnalysis.contactInfo || {};
        const skills = [...(originalAnalysis.skillsFound || [])];
        const summary = originalAnalysis.summary || '';
        const targetRole = originalAnalysis.targetRole || 'Software Engineer';
        const jobMatch = originalAnalysis.jobMatch || null;

        // Structured initial experience bullets from analysis
        const bullets = [];
        if (originalAnalysis.experienceStats && originalAnalysis.experienceStats.bullets) {
            originalAnalysis.experienceStats.bullets.forEach(b => {
                const text = typeof b === 'string' ? b : b.text;
                if (text) bullets.push(text);
            });
        }
        if (bullets.length === 0) {
            bullets.push(`Engineered software solutions as ${targetRole}.`);
            bullets.push('Collaborated with cross-functional teams to deliver key technical milestones.');
        }

        return {
            version: '1.0',
            workspaceVersion: '1.0',
            targetRole,
            analyzedAt: new Date().toISOString(),
            originalAnalysis: {
                scores: originalAnalysis.scores || { atsScore: 75, skillsMatchPct: 70, qualityScore: 80, formattingScore: 85 },
                jobMatchScore: jobMatch ? jobMatch.matchScore : null,
                skillsFound: [...skills],
                summary: summary
            },
            contact: {
                name: contact.name || 'Candidate Name',
                email: contact.email || '',
                phone: contact.phone || '',
                linkedin: contact.linkedin || '',
                github: contact.github || ''
            },
            summary: summary.startsWith('Your resume has been processed') ? `Experienced ${targetRole} skilled in ${skills.slice(0, 3).join(', ')}.` : summary,
            skills: skills,
            experience: [
                {
                    id: 'exp-0',
                    title: targetRole,
                    company: 'Professional Experience',
                    bullets: bullets
                }
            ],
            projects: [
                {
                    id: 'proj-0',
                    name: 'Key Project',
                    description: `Developed technical features utilizing ${skills.slice(0, 2).join(' and ') || 'modern tools'}.`
                }
            ],
            education: [
                {
                    id: 'edu-0',
                    degree: 'Bachelor of Science / Technology',
                    institution: 'University',
                    year: '2024'
                }
            ],
            suggestionStates: {}, // suggestionId -> 'accepted' | 'edited' | 'dismissed'
            changeHistory: [],
            optimizedAnalysis: null
        };
    }

    /**
     * Retrieve or initialize draft model from sessionStorage
     */
    function getDraft(originalAnalysis = null) {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;

        try {
            const storedStr = sessionStorage.getItem(WORKSPACE_KEY);
            if (storedStr) {
                return JSON.parse(storedStr);
            }
        } catch (err) {
            console.warn('[Workspace] Failed to read draft workspace from sessionStorage:', err);
        }

        if (originalAnalysis) {
            const newDraft = buildInitialDraft(originalAnalysis);
            saveDraft(newDraft);
            return newDraft;
        }

        return null;
    }

    /**
     * Save draft model to sessionStorage
     */
    function saveDraft(draftModel) {
        if (typeof window === 'undefined' || !window.sessionStorage || !draftModel) return;
        try {
            sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(draftModel));
        } catch (err) {
            console.warn('[Workspace] Failed to save draft to sessionStorage:', err);
        }
    }

    /**
     * Snapshot draft for Undo stack
     */
    function pushSnapshot(draftModel) {
        if (!draftModel) return;
        if (undoStack.length >= MAX_UNDO_STACK) {
            undoStack.shift();
        }
        undoStack.push(JSON.stringify(draftModel));
    }

    /**
     * Undo last change
     */
    function undo(currentDraft) {
        if (undoStack.length === 0) return currentDraft;
        const prevStr = undoStack.pop();
        try {
            const restored = JSON.parse(prevStr);
            saveDraft(restored);
            return restored;
        } catch (err) {
            console.error('[Workspace] Undo restore failed:', err);
            return currentDraft;
        }
    }

    /**
     * Reset draft to original initial state
     */
    function reset(originalAnalysis) {
        undoStack = [];
        const freshDraft = buildInitialDraft(originalAnalysis);
        saveDraft(freshDraft);
        return freshDraft;
    }

    /**
     * Accept a suggestion
     */
    function acceptSuggestion(draftModel, suggestion) {
        if (!draftModel || !suggestion) return draftModel;
        pushSnapshot(draftModel);

        const { id, section, original, suggestion: suggestedText } = suggestion;

        if (section === 'summary') {
            draftModel.summary = suggestedText;
        } else if (section === 'experience') {
            if (draftModel.experience.length > 0) {
                const bullets = draftModel.experience[0].bullets;
                const idx = bullets.findIndex(b => b === original || original.includes(b));
                if (idx !== -1) {
                    bullets[idx] = suggestedText;
                } else {
                    bullets.push(suggestedText);
                }
            }
        }

        draftModel.suggestionStates[id] = 'accepted';
        draftModel.changeHistory.push({
            id: `chg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            suggestionId: id,
            action: 'accepted',
            description: `Accepted suggestion for ${section}: "${suggestedText.slice(0, 30)}..."`
        });

        saveDraft(draftModel);
        return draftModel;
    }

    /**
     * Edit and accept a suggestion with custom text
     */
    function editSuggestion(draftModel, suggestion, customText) {
        if (!draftModel || !suggestion || !customText) return draftModel;
        pushSnapshot(draftModel);

        const { id, section, original } = suggestion;

        if (section === 'summary') {
            draftModel.summary = customText;
        } else if (section === 'experience') {
            if (draftModel.experience.length > 0) {
                const bullets = draftModel.experience[0].bullets;
                const idx = bullets.findIndex(b => b === original || original.includes(b));
                if (idx !== -1) {
                    bullets[idx] = customText;
                } else {
                    bullets.push(customText);
                }
            }
        }

        draftModel.suggestionStates[id] = 'edited';
        draftModel.changeHistory.push({
            id: `chg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            suggestionId: id,
            action: 'edited',
            description: `Edited suggestion for ${section}: "${customText.slice(0, 30)}..."`
        });

        saveDraft(draftModel);
        return draftModel;
    }

    /**
     * Dismiss a suggestion
     */
    function dismissSuggestion(draftModel, suggestionId) {
        if (!draftModel || !suggestionId) return draftModel;
        pushSnapshot(draftModel);

        draftModel.suggestionStates[suggestionId] = 'dismissed';
        draftModel.changeHistory.push({
            id: `chg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            suggestionId,
            action: 'dismissed',
            description: `Dismissed suggestion ${suggestionId}`
        });

        saveDraft(draftModel);
        return draftModel;
    }

    /**
     * Converts structured draft model into plain text format for re-analysis
     */
    function convertDraftToText(draftModel) {
        if (!draftModel) return '';

        let text = `${draftModel.contact.name || 'Candidate'}\n`;
        text += `Email: ${draftModel.contact.email || ''} | Phone: ${draftModel.contact.phone || ''}\n`;
        if (draftModel.contact.linkedin) text += `LinkedIn: ${draftModel.contact.linkedin}\n`;
        if (draftModel.contact.github) text += `GitHub: ${draftModel.contact.github}\n`;
        text += `\nProfessional Summary\n${draftModel.summary || ''}\n\n`;

        text += `Technical Skills\n${(draftModel.skills || []).join(', ')}\n\n`;

        text += `Work Experience\n`;
        (draftModel.experience || []).forEach(exp => {
            text += `${exp.title || 'Role'} at ${exp.company || 'Company'}\n`;
            (exp.bullets || []).forEach(b => {
                text += `• ${b}\n`;
            });
        });

        text += `\nProjects\n`;
        (draftModel.projects || []).forEach(p => {
            text += `${p.name || 'Project'}: ${p.description || ''}\n`;
        });

        text += `\nEducation\n`;
        (draftModel.education || []).forEach(e => {
            text += `${e.degree || 'Degree'} - ${e.institution || 'University'} (${e.year || ''})\n`;
        });

        return text;
    }

    /**
     * Deterministically Re-analyzes the Draft using ResumeIQAnalyzer
     */
    function reanalyzeDraft(draftModel, originalAnalysis = null) {
        if (!draftModel || typeof window === 'undefined' || !window.ResumeIQAnalyzer) {
            return draftModel;
        }

        pushSnapshot(draftModel);

        const draftText = convertDraftToText(draftModel);
        const targetRole = draftModel.targetRole || 'Software Engineer';

        // 1. Run Deterministic Resume Analysis on Draft
        const newAnalysis = window.ResumeIQAnalyzer.analyzeResumeContent(
            draftText,
            targetRole,
            'Optimized_Resume_Draft.pdf',
            '180 KB'
        );

        // 2. Run Deterministic Job Match on Draft if original analysis had Job Description
        const originalJd = originalAnalysis?.jobMatch ? (originalAnalysis.jobMatch.rawJdText || originalAnalysis.jobMatch.summary || '') : null;
        if (originalJd && originalJd.length >= 20) {
            const newJobMatch = window.ResumeIQAnalyzer.analyzeJobMatchContent(draftText, originalJd, targetRole);
            newAnalysis.jobMatch = newJobMatch;
        }

        // 3. Compute Score Diffs Honestly (Sole Source of Truth = Deterministic Engine)
        const origAts = draftModel.originalAnalysis.scores.atsScore;
        const origSkills = draftModel.originalAnalysis.scores.skillsMatchPct;
        const origQuality = draftModel.originalAnalysis.scores.qualityScore;
        const origJobMatch = draftModel.originalAnalysis.jobMatchScore;

        const newAts = newAnalysis.scores.atsScore;
        const newSkills = newAnalysis.scores.skillsMatchPct;
        const newQuality = newAnalysis.scores.qualityScore;
        const newJobMatch = newAnalysis.jobMatch ? newAnalysis.jobMatch.matchScore : null;

        newAnalysis.diffs = {
            atsScore: newAts - origAts,
            skillsMatchPct: newSkills - origSkills,
            qualityScore: newQuality - origQuality,
            jobMatchScore: (newJobMatch !== null && origJobMatch !== null) ? (newJobMatch - origJobMatch) : null
        };

        draftModel.optimizedAnalysis = newAnalysis;
        saveDraft(draftModel);

        return draftModel;
    }

    return {
        getDraft,
        saveDraft,
        buildInitialDraft,
        acceptSuggestion,
        editSuggestion,
        dismissSuggestion,
        undo,
        reset,
        convertDraftToText,
        reanalyzeDraft
    };
})();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.ResumeIQWorkspace = ResumeIQWorkspace;
}
