const mongoose = require('mongoose');

/**
 * Standardized Job Match Result Schema Model
 * Privacy Rule: DO NOT STORE RAW RESUME TEXT, PDF BUFFERS, OR RAW JOB DESCRIPTION TEXT.
 */
const JobMatchSchema = new mongoose.Schema(
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
        analysisId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Analysis',
            default: null
        },
        targetRole: {
            type: String,
            required: true,
            default: 'Software Engineer'
        },
        jobMatch: {
            matchScore: { type: Number, required: true, min: 0, max: 100 },
            scores: {
                requiredSkills: { type: Number, default: 70 },
                preferredSkills: { type: Number, default: 70 },
                keywords: { type: Number, default: 70 },
                roleRelevance: { type: Number, default: 70 },
                experience: { type: Number, default: 70 }
            },
            requiredSkills: [{ type: String }],
            preferredSkills: [{ type: String }],
            matchingSkills: [{ type: String }],
            missingSkills: [{ type: String }],
            matchingKeywords: [{ type: String }],
            missingKeywords: [{ type: String }],
            recommendations: [
                {
                    title: { type: String, required: true },
                    desc: { type: String, required: true }
                }
            ],
            summary: { type: String, required: true }
        },
        metadata: {
            resumeWordCount: { type: Number, default: 0 },
            jobDescriptionWordCount: { type: Number, default: 0 },
            analyzedAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    }
);

// Compound index for efficient user-specific job match queries
JobMatchSchema.index({ userId: 1, createdAt: -1 });

// Transform output JSON to expose clean `id`
JobMatchSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('JobMatch', JobMatchSchema);
