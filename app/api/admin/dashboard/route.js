import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import ChatMessage from '@/models/ChatMessage';
import Comment from '@/models/Comment';
import Test from '@/models/Test';
import Leaderboard from '@/models/Leaderboard';
import LicenseKey from '@/models/LicenseKey';
import BlockedIP from '@/models/BlockedIP';
import { getDDoSStatus } from '@/lib/security';
import { loadBlockedCache } from '@/app/api/admin/block/route';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await dbConnect();

  // Load blocked IPs cache if not loaded
  if (!global._blockedCache?.loaded) {
    await loadBlockedCache();
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d

  const now = new Date();
  let startDate;
  switch (period) {
    case '7d': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(now - 24 * 60 * 60 * 1000);
  }

  try {
    // Parallel queries for dashboard stats
    const [
      totalLogs,
      suspiciousLogs,
      aiRequests,
      chatMessages,
      comments,
      testsCount,
      leaderboardCount,
      activeKeys,
      blockedIPs,
      // Activity breakdown by type
      activityByType,
      // Visits over time (hourly for 24h, daily for 7d/30d)
      visitsOverTime,
      // Top tests by activity
      topTests,
      // Difficulty distribution
      difficultyDist,
      // Recent suspicious activities
      recentSuspicious,
      // AI usage by user
      aiByUser,
      // Recent logs
      recentLogs,
      // Study mode usage
      studyModeUsage,
    ] = await Promise.all([
      // Total logs in period
      ActivityLog.countDocuments({ createdAt: { $gte: startDate } }),
      // Suspicious logs
      ActivityLog.countDocuments({ isSuspicious: true, createdAt: { $gte: startDate } }),
      // AI requests
      ActivityLog.countDocuments({ type: 'ai_request', createdAt: { $gte: startDate } }),
      // Chat messages count
      ChatMessage.countDocuments({}),
      // Comments count  
      Comment.countDocuments({}),
      // Tests count
      Test.countDocuments({}),
      // Leaderboard entries
      Leaderboard.countDocuments({ date: { $gte: startDate } }),
      // Active license keys
      LicenseKey.countDocuments({ status: 'active' }),
      // Blocked IPs count
      BlockedIP.countDocuments({ isActive: true }),
      
      // Activity breakdown
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      // Visits over time
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: period === '24h'
              ? { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } }
              : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            uniqueIPs: { $addToSet: '$ip' },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 1, count: 1, uniqueVisitors: { $size: '$uniqueIPs' } } },
      ]),
      
      // Top tests
      ActivityLog.aggregate([
        { $match: { type: { $in: ['test_start', 'test_complete'] }, createdAt: { $gte: startDate } } },
        { $group: { _id: '$details.testName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      
      // Difficulty distribution
      Leaderboard.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      
      // Recent suspicious
      ActivityLog.find({ isSuspicious: true })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      
      // AI by user
      ActivityLog.aggregate([
        { $match: { type: 'ai_request', createdAt: { $gte: startDate } } },
        { $group: { _id: '$userName', count: { $sum: 1 }, lastUsed: { $max: '$createdAt' } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      
      // Recent logs
      ActivityLog.find({ createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      
      // Study mode usage
      ActivityLog.aggregate([
        { $match: { type: 'ai_request', 'details.studyMode': true, createdAt: { $gte: startDate } } },
        { $group: { _id: '$userName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Get active users from global sessions
    const activeSessions = global.activeSessions ? Object.values(global.activeSessions) : [];

    // DDoS status
    const ddosStatus = getDDoSStatus();

    // Unique visitors (unique IPs in period)
    const uniqueVisitors = await ActivityLog.distinct('ip', { createdAt: { $gte: startDate } });

    return NextResponse.json({
      stats: {
        totalLogs,
        suspiciousLogs,
        aiRequests,
        chatMessages,
        comments,
        testsCount,
        leaderboardCount,
        activeKeys,
        blockedIPs,
        activeUsers: activeSessions.length,
        uniqueVisitors: uniqueVisitors.length,
      },
      charts: {
        activityByType,
        visitsOverTime,
        topTests,
        difficultyDist,
        aiByUser,
        studyModeUsage,
      },
      security: {
        recentSuspicious,
        ddosStatus,
      },
      recentLogs,
      activeSessions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
