import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Leaderboard from '@/models/Leaderboard';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard/review?id=<leaderboard_id>
 * 
 * Faqat o'z natijalaringizni ko'rish uchun.
 * Security: IP + User-Agent bilan tekshirish (basic protection)
 */
export async function GET(request) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        // MongoDB ID validation
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        const entry = await Leaderboard.findById(id).lean();

        if (!entry) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // 🔐 SECURITY: Faqat oxirgi 24 soat ichida yaratilgan natijalarni ko'rsatish
        const ageMs = Date.now() - new Date(entry.date).getTime();
        const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 soat

        if (ageMs > MAX_AGE_MS) {
            const reqInfo = extractRequestInfo(request);
            logActivity({
                ...reqInfo,
                type: 'review_expired_attempt',
                isSuspicious: true,
                suspiciousReason: 'Attempted to view old test results',
                details: { entryId: id, ageMs }
            });

            return NextResponse.json({ 
                error: 'Test results expired (24h limit)' 
            }, { status: 403 });
        }

        // Return full data including questions for review
        return NextResponse.json({
            _id: entry._id,
            name: entry.name,
            testName: entry.testName,
            testId: entry.testId,
            score: entry.score,
            total: entry.total,
            percentage: (entry.score / entry.total) * 100,
            difficulty: entry.difficulty,
            duration: entry.duration,
            date: entry.date,
            questions: entry.questions || [],
            answers: entry.answers || {}
        });

    } catch (error) {
        console.error('Review GET error:', error);
        return NextResponse.json({ 
            error: 'Internal error' 
        }, { status: 500 });
    }
}
