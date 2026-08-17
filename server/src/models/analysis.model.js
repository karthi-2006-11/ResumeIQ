const mongoose = require('mongoose');

/**
 * Standardized Resume Analysis Result Schema Model
 * Privacy Rule: DO NOT STORE RAW RESUME TEXT OR PDF BUFFERS.
 */
const AnalysisSchema = new mongoose.Schema(
    {
        version: {
            type: String,
            default: '1.0',
            required: true
        },
        mode: {
            type: String,
            enum: ['local', 'backend', 'ai'],
            default: 'backend',
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true
        },
        fileName: {
            type: String,
            required: true,
            default: 'Resume.pdf'
        },
        fileSize: {
            type: String,
            required: true,
            default: '240 KB'
        },
        targetRole: {
            type: String,
            required: true,
            default: 'Software Engineer'
        },
        hasExtractedText: {
            type: Boolean,
            default: true
        },
        isDemo: {
            type: Boolean,
            default: false
        },
        scores: {
            atsScore: { type: Number, required: true, min: 0, max: 100 },
            skillsMatchPct: { type: Number, required: true, min: 0, max: 100 },
            qualityScore: { type: Number, required: true, min: 0, max: 100 },
            formattingScore: { type: Number, required: true, min: 0, max: 100 }
        },
        contactInfo: {
            hasEmail: { type: Boolean, default: false },
            email: { type: String, default: null },
            hasPhone: { type: Boolean, default: false },
            phone: { type: String, default: null },
            hasLinkedin: { type: Boolean, default: false },
            linkedin: { type: String, default: null },
            hasGithub: { type: Boolean, default: false },
            github: { type: String, default: null }
        },
        sectionsFound: [{ type: String }],
        skillsFound: [{ type: String }],
        skillsMissing: [{ type: String }],
        suggestions: [
            {
                title: { type: String, required: true },
                desc: { type: String, required: true }
            }
        ],
        summary: {
            type: String,
            required: true
        },
        metadata: {
            wordCount: { type: Number, default: 0 },
            pageCount: { type: Number, default: 1 },
            analyzedAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    }
);

// Compound index for efficient user-specific history queries
AnalysisSchema.index({ userId: 1, createdAt: -1 });

// Transform output JSON to expose clean `id`
AnalysisSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);
