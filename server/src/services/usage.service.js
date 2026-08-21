const User = require('../models/user.model');
const { isConnected } = require('../config/database');
const { mockUserStore } = require('./auth.service');

/**
 * Tier Configuration & Monthly Quota Constants
 */
const TIER_LIMITS = {
    free: {
        analysisLimit: 10,
        jobMatchLimit: 5
    },
    pro: {
        analysisLimit: 100,
        jobMatchLimit: 50
    }
};

/**
 * Returns current UTC period string ('YYYY-MM')
 */
function getCurrentUtcPeriod() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Returns ISO date string for first second of next UTC month
 */
function getNextResetDateStr(periodStr) {
    const [yearStr, monthStr] = (periodStr || getCurrentUtcPeriod()).split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    if (month === 12) {
        year += 1;
        month = 1;
    } else {
        month += 1;
    }
    const nextMonthStr = String(month).padStart(2, '0');
    return `${year}-${nextMonthStr}-01T00:00:00.000Z`;
}

/**
 * Returns configured limits for a tier
 */
function getTierLimits(tier = 'free') {
    return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Formats clean usage response object for client
 */
function formatUsagePayload(userDoc) {
    const tier = userDoc.tier || 'free';
    const limits = getTierLimits(tier);
    const usage = userDoc.usage || {};
    const period = usage.lastResetDate || getCurrentUtcPeriod();
    const currentPeriod = getCurrentUtcPeriod();

    // Lazy reset check for read
    const isPastPeriod = period !== currentPeriod;
    const analysisUsed = isPastPeriod ? 0 : (usage.analysisCount || 0);
    const jobMatchUsed = isPastPeriod ? 0 : (usage.jobMatchCount || 0);

    return {
        tier,
        period: currentPeriod,
        resetDate: getNextResetDateStr(currentPeriod),
        analysis: {
            used: analysisUsed,
            limit: limits.analysisLimit,
            remaining: Math.max(0, limits.analysisLimit - analysisUsed)
        },
        jobMatch: {
            used: jobMatchUsed,
            limit: limits.jobMatchLimit,
            remaining: Math.max(0, limits.jobMatchLimit - jobMatchUsed)
        }
    };
}

/**
 * Helper to retrieve raw persisted usage subdocument without Mongoose schema defaults
 */
function getPersistedUsage(userDoc) {
    if (!userDoc) return null;

    const doc = userDoc._doc || userDoc;

    if (doc && doc.usage && doc.usage.lastResetDate) {
        return doc.usage;
    }

    return null;
}

/**
 * Retrieves user usage metrics from MongoDB with lazy reset if month changed
 */
async function getUserUsage(userId) {
    if (!userId) return formatUsagePayload({});

    if (!isConnected()) {
        const mock = mockUserStore.get(userId);
        if (!mock) return formatUsagePayload({});
        const currentPeriod = getCurrentUtcPeriod();
        if (!mock.usage || !mock.usage.lastResetDate || mock.usage.lastResetDate !== currentPeriod) {
            mock.usage = { analysisCount: 0, jobMatchCount: 0, lastResetDate: currentPeriod };
        }
        return formatUsagePayload(mock);
    }

    let user = await User.findById(userId);
    if (!user) {
        return formatUsagePayload({});
    }

    const currentPeriod = getCurrentUtcPeriod();
    const rawUsage = getPersistedUsage(user);
    const isUninitializedOnDisk = !rawUsage || !rawUsage.lastResetDate;
    const isOutdatedPeriod = rawUsage && rawUsage.lastResetDate !== currentPeriod;

    if (isUninitializedOnDisk || isOutdatedPeriod) {
        user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'usage.analysisCount': isUninitializedOnDisk ? 0 : (isOutdatedPeriod ? 0 : (rawUsage?.analysisCount || 0)),
                    'usage.jobMatchCount': isUninitializedOnDisk ? 0 : (isOutdatedPeriod ? 0 : (rawUsage?.jobMatchCount || 0)),
                    'usage.lastResetDate': currentPeriod
                }
            },
            { new: true }
        );
    }

    return formatUsagePayload(user);
}

/**
 * Atomically reserves a quota slot for an operation under high concurrency.
 * @param {string} userId
 * @param {'analysis'|'jobMatch'} quotaType
 * @returns {Promise<{ success: boolean, usage?: Object, message?: string }>}
 */
async function reserveQuota(userId, quotaType = 'analysis') {
    if (!userId) return { success: true }; // Guests bypass account quota

    const currentPeriod = getCurrentUtcPeriod();
    const countField = quotaType === 'jobMatch' ? 'jobMatchCount' : 'analysisCount';

    if (!isConnected()) {
        const mock = mockUserStore.get(userId);
        if (!mock) return { success: true };

        const tier = mock.tier || 'free';
        const limits = getTierLimits(tier);
        const limit = quotaType === 'jobMatch' ? limits.jobMatchLimit : limits.analysisLimit;

        if (!mock.usage || !mock.usage.lastResetDate || mock.usage.lastResetDate !== currentPeriod) {
            mock.usage = { analysisCount: 0, jobMatchCount: 0, lastResetDate: currentPeriod };
        }

        if (mock.usage[countField] >= limit) {
            const currentUsage = formatUsagePayload(mock);
            return {
                success: false,
                message: `Monthly ${quotaType === 'jobMatch' ? 'job match' : 'resume analysis'} quota of ${limit} reached for your ${tier.toUpperCase()} plan. Limits reset on ${getNextResetDateStr(currentPeriod)}.`,
                usage: currentUsage
            };
        }

        mock.usage[countField] += 1;
        return {
            success: true,
            usage: formatUsagePayload(mock)
        };
    }

    // 1. Ensure user usage record is initialized to current period on disk if uninitialized or outdated
    let user = await User.findById(userId);
    if (!user) return { success: true };

    const tier = user.tier || 'free';
    const limits = getTierLimits(tier);
    const limit = quotaType === 'jobMatch' ? limits.jobMatchLimit : limits.analysisLimit;

    const rawUsage = getPersistedUsage(user);
    const isUninitializedOnDisk = !rawUsage || !rawUsage.lastResetDate;
    const isOutdatedPeriod = rawUsage && rawUsage.lastResetDate !== currentPeriod;

    if (isUninitializedOnDisk || isOutdatedPeriod) {
        user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    'usage.analysisCount': isUninitializedOnDisk ? 0 : (isOutdatedPeriod ? 0 : (rawUsage?.analysisCount || 0)),
                    'usage.jobMatchCount': isUninitializedOnDisk ? 0 : (isOutdatedPeriod ? 0 : (rawUsage?.jobMatchCount || 0)),
                    'usage.lastResetDate': currentPeriod
                }
            },
            { new: true }
        );
    }

    // 2. Atomic reservation query: increment count ONLY IF current count < limit
    const reservedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            'usage.lastResetDate': currentPeriod,
            [`usage.${countField}`]: { $lt: limit }
        },
        {
            $inc: { [`usage.${countField}`]: 1 }
        },
        { new: true }
    );

    if (!reservedUser) {
        // Quota exhausted!
        const currentUsage = await getUserUsage(userId);
        return {
            success: false,
            message: `Monthly ${quotaType === 'jobMatch' ? 'job match' : 'resume analysis'} quota of ${limit} reached for your ${tier.toUpperCase()} plan. Limits reset on ${getNextResetDateStr(currentPeriod)}.`,
            usage: currentUsage
        };
    }

    return {
        success: true,
        usage: formatUsagePayload(reservedUser)
    };
}

/**
 * Atomically releases/refunds a reserved quota slot if processing fails (e.g. invalid PDF, corrupt file, 400 error)
 * @param {string} userId
 * @param {'analysis'|'jobMatch'} quotaType
 */
async function releaseQuota(userId, quotaType = 'analysis') {
    if (!userId) return;
    const countField = quotaType === 'jobMatch' ? 'jobMatchCount' : 'analysisCount';

    if (!isConnected()) {
        const mock = mockUserStore.get(userId);
        if (mock && mock.usage && mock.usage[countField] > 0) {
            mock.usage[countField] -= 1;
        }
        return;
    }

    await User.findOneAndUpdate(
        {
            _id: userId,
            [`usage.${countField}`]: { $gt: 0 }
        },
        {
            $inc: { [`usage.${countField}`]: -1 }
        }
    );
}

module.exports = {
    TIER_LIMITS,
    getCurrentUtcPeriod,
    getNextResetDateStr,
    getTierLimits,
    getUserUsage,
    reserveQuota,
    releaseQuota,
    formatUsagePayload
};
