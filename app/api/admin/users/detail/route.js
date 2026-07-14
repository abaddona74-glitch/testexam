import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';
import Leaderboard from '@/models/Leaderboard';
import LicenseKey from '@/models/LicenseKey';
import Referral from '@/models/Referral';
import Comment from '@/models/Comment';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userName = searchParams.get('userName');
        if (!userName) {
            return NextResponse.json({ error: 'userName is required' }, { status: 400 });
        }

        await dbConnect();

        // 1. User model
        const userDoc = await User.findOne({ userName }).lean();

        // 2. Recent activities
        const recentActivities = await ActivityLog.find({ userName })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // 3. Activity stats
        const stats = await ActivityLog.aggregate([
            { $match: { userName } },
            {
                $group: {
                    _id: null,
                    totalActivities: { $sum: 1 },
                    uniqueIPs: { $addToSet: '$ip' },
                    uniqueCountries: { $addToSet: '$country' },
                    testStarts: { $sum: { $cond: [{ $eq: ['$type', 'test_start'] }, 1, 0] } },
                    testCompletes: { $sum: { $cond: [{ $eq: ['$type', 'test_complete'] }, 1, 0] } },
                    aiRequests: { $sum: { $cond: [{ $eq: ['$type', 'ai_request'] }, 1, 0] } },
                    cheatViolations: { $sum: { $cond: [{ $eq: ['$type', 'cheat_violation'] }, 1, 0] } },
                    firstSeen: { $min: '$createdAt' },
                    lastSeen: { $max: '$createdAt' },
                    isSuspicious: { $max: { $cond: ['$isSuspicious', true, false] } },
                }
            }
        ]);

        // 4. Activity by type
        const activityByType = await ActivityLog.aggregate([
            { $match: { userName } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // 5. IPs used (with counts)
        const ipsUsed = await ActivityLog.aggregate([
            { $match: { userName } },
            { $group: { _id: '$ip', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' }, countries: { $addToSet: '$country' } } },
            { $sort: { count: -1 } }
        ]);

        // 6. User agents
        const userAgents = await ActivityLog.aggregate([
            { $match: { userName, userAgent: { $exists: true, $ne: '' } } },
            { $group: { _id: '$userAgent', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' } } },
            { $sort: { count: -1 } }
        ]);

        // 7. Leaderboard entries
        const leaderboardEntries = await Leaderboard.find({ name: userName })
            .sort({ date: -1 })
            .limit(50)
            .lean();

        // 8. License keys used
        const licenseKeys = await LicenseKey.find({ usedBy: userName }).lean();

        // 9. Referrals
        const referrals = await Referral.find({
            $or: [{ inviterName: userName }, { inviteeName: userName }]
        }).lean();

        // 10. Comments
        const comments = await Comment.find({ userName }).sort({ createdAt: -1 }).limit(20).lean();

        // 11. Current active session (from memory)
        let activeSession = null;
        const sessions = global.activeSessions;
        if (sessions) {
            for (const [, session] of sessions) {
                if (session.name === userName) {
                    activeSession = {
                        status: session.status,
                        device: session.device,
                        ip: session.ip,
                        country: session.country,
                        city: session.city,
                        lat: session.lat,
                        lng: session.lng,
                        gpsAccuracy: session.gpsAccuracy,
                        locationSource: session.locationSource,
                        cameraStatus: session.cameraStatus,
                        hasCameraSnapshot: !!session.cameraSnapshot,
                        cameraUpdatedAt: session.cameraUpdatedAt,
                        testId: session.testId,
                        difficulty: session.difficulty,
                        progress: session.progress,
                        total: session.total,
                        stars: session.stars,
                        theme: session.theme,
                        lastUpdated: session.lastUpdated,
                    };
                    break;
                }
            }
        }

        // 12. Multi-account check (same IPs)
        const myIPs = ipsUsed.map(i => i._id).filter(Boolean);
        const sameIPUsers = myIPs.length > 0 ? await ActivityLog.aggregate([
            { $match: { ip: { $in: myIPs }, userName: { $ne: userName } } },
            { $group: { _id: '$userName', ips: { $addToSet: '$ip' } } },
            { $project: { userName: '$_id', ips: 1, _id: 0 } }
        ]) : [];

        return NextResponse.json({
            user: userDoc ? {
                userName: userDoc.userName,
                stars: userDoc.stars,
                lastSpinDate: userDoc.lastSpinDate,
                createdAt: userDoc.createdAt,
                updatedAt: userDoc.updatedAt,
            } : { userName },
            stats: stats[0] || {},
            activityByType,
            ips: ipsUsed.filter(i => i._id && i._id !== '::1' && i._id !== '127.0.0.1'),
            userAgents: userAgents.map(ua => ({
                raw: ua._id,
                browser: parseBrowser(ua._id),
                os: parseOS(ua._id),
                count: ua.count,
                lastSeen: ua.lastSeen,
            })),
            recentActivities: recentActivities.slice(0, 50).map(a => ({
                type: a.type,
                ip: a.ip,
                path: a.path,
                country: a.country,
                city: a.city,
                createdAt: a.createdAt,
                isSuspicious: a.isSuspicious,
                suspiciousReason: a.suspiciousReason,
                details: a.details,
            })),
            leaderboardEntries: leaderboardEntries.map(e => ({
                testName: e.testName,
                score: e.score,
                total: e.total,
                difficulty: e.difficulty,
                duration: e.duration,
                date: e.date,
                country: e.country,
            })),
            licenseKeys,
            referrals,
            comments: comments.map(c => ({
                text: c.text?.substring(0, 200),
                testId: c.testId,
                createdAt: c.createdAt,
            })),
            activeSession,
            sameIPUsers,
        });
    } catch (error) {
        console.error('User detail API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function parseBrowser(ua) {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    return 'Other';
}

function parseOS(ua) {
    if (!ua) return 'Unknown';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) return 'iOS';
    return 'Other';
}
