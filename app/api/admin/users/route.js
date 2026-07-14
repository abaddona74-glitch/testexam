import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const sortBy = searchParams.get('sortBy') || 'lastSeen';
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

        await dbConnect();

        // 1. Aggregate per-user stats from ActivityLog
        const matchStage = {};
        if (search) {
            matchStage.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { userId: { $regex: search, $options: 'i' } },
                { ip: { $regex: search, $options: 'i' } },
            ];
        }

        const aggregation = [
            { $match: { userName: { $exists: true, $ne: '' } } },
            {
                $group: {
                    _id: '$userName',
                    userId: { $last: '$userId' },
                    ips: { $addToSet: '$ip' },
                    countries: { $addToSet: '$country' },
                    cities: { $addToSet: '$city' },
                    userAgents: { $addToSet: '$userAgent' },
                    deviceIds: { $addToSet: '$deviceId' },
                    activityTypes: { $addToSet: '$type' },
                    totalActivities: { $sum: 1 },
                    firstSeen: { $min: '$createdAt' },
                    lastSeen: { $max: '$createdAt' },
                    isSuspicious: { $max: { $cond: ['$isSuspicious', true, false] } },
                    suspiciousReasons: { $addToSet: '$suspiciousReason' },
                    testStarts: { $sum: { $cond: [{ $eq: ['$type', 'test_start'] }, 1, 0] } },
                    testCompletes: { $sum: { $cond: [{ $eq: ['$type', 'test_complete'] }, 1, 0] } },
                    aiRequests: { $sum: { $cond: [{ $eq: ['$type', 'ai_request'] }, 1, 0] } },
                    cheatViolations: { $sum: { $cond: [{ $eq: ['$type', 'cheat_violation'] }, 1, 0] } },
                }
            },
        ];

        if (search) {
            aggregation.unshift({ $match: matchStage });
        }

        const sortStage = {};
        if (sortBy === 'lastSeen') sortStage.lastSeen = sortOrder;
        else if (sortBy === 'firstSeen') sortStage.firstSeen = sortOrder;
        else if (sortBy === 'totalActivities') sortStage.totalActivities = sortOrder;
        else if (sortBy === 'testCompletes') sortStage.testCompletes = sortOrder;
        else if (sortBy === 'stars') sortStage.stars = sortOrder;
        else sortStage.lastSeen = -1;

        aggregation.push({ $sort: sortStage });

        const activityUsers = await ActivityLog.aggregate(aggregation);

        // 2. Get User model data (stars, registration date)
        const userNames = activityUsers.map(u => u._id);
        const userDocs = await User.find({ userName: { $in: userNames } }).lean();
        const userMap = {};
        for (const u of userDocs) {
            userMap[u.userName] = u;
        }

        // 3. Get active sessions (current online status)
        const activeSessions = global.activeSessions;
        const activeUserNames = new Set();
        if (activeSessions) {
            for (const session of Object.values(activeSessions)) {
                if (session.name) activeUserNames.add(session.name);
            }
        }

        // 4. Count IP sharing
        const ipUserMap = {};
        for (const u of activityUsers) {
            for (const ip of u.ips) {
                if (!ip || ip === '::1' || ip === '127.0.0.1') continue;
                if (!ipUserMap[ip]) ipUserMap[ip] = [];
                ipUserMap[ip].push(u._id);
            }
        }

        // 5. Build response
        const users = activityUsers.map(u => {
            const userDoc = userMap[u._id];
            const multiAccountIps = u.ips.filter(ip => (ipUserMap[ip] || []).length > 1);
            const browserInfo = parseUserAgents(u.userAgents);
            return {
                userName: u._id,
                userId: u.userId,
                stars: userDoc?.stars || 0,
                registeredAt: userDoc?.createdAt || u.firstSeen,
                ips: u.ips.filter(ip => ip && ip !== '::1' && ip !== '127.0.0.1'),
                multiAccountIps,
                accountCountOnIps: multiAccountIps.map(ip => ({
                    ip,
                    count: (ipUserMap[ip] || []).length,
                    accounts: (ipUserMap[ip] || []).filter(n => n !== u._id),
                })),
                countries: u.countries.filter(Boolean),
                cities: u.cities.filter(Boolean),
                browsers: browserInfo.browsers,
                os: browserInfo.os,
                deviceIds: u.deviceIds.filter(Boolean),
                firstSeen: u.firstSeen,
                lastSeen: u.lastSeen,
                totalActivities: u.totalActivities,
                testStarts: u.testStarts,
                testCompletes: u.testCompletes,
                aiRequests: u.aiRequests,
                cheatViolations: u.cheatViolations,
                isSuspicious: u.isSuspicious,
                suspiciousReasons: u.suspiciousReasons.filter(Boolean),
                isOnline: activeUserNames.has(u._id),
            };
        });

        return NextResponse.json({
            users,
            total: users.length,
            ipStats: Object.entries(ipUserMap)
                .filter(([ip]) => ip && ip !== '::1' && ip !== '127.0.0.1')
                .map(([ip, accounts]) => ({ ip, accountCount: accounts.length, accounts }))
                .filter(s => s.accountCount > 1)
                .sort((a, b) => b.accountCount - a.accountCount),
        });
    } catch (error) {
        console.error('Admin users API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function parseUserAgents(userAgents) {
    const browsers = new Set();
    const os = new Set();
    for (const ua of userAgents) {
        if (!ua) continue;
        if (ua.includes('Chrome')) browsers.add('Chrome');
        else if (ua.includes('Firefox')) browsers.add('Firefox');
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browsers.add('Safari');
        else if (ua.includes('Edge')) browsers.add('Edge');
        else if (ua.includes('Opera')) browsers.add('Opera');
        else browsers.add('Other');

        if (ua.includes('Android')) os.add('Android');
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os.add('iOS');
        else if (ua.includes('Windows')) os.add('Windows');
        else if (ua.includes('Mac OS')) os.add('macOS');
        else if (ua.includes('Linux')) os.add('Linux');
        else os.add('Other');
    }
    return {
        browsers: [...browsers],
        os: [...os],
    };
}
