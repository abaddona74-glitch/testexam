import { NextResponse } from 'next/server';
import { verifyAnswer, getTestResults } from '@/lib/test-security';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/verify
 * Bir savolning javobini tekshirish (real-time feedback uchun)
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { sessionId, testId, questionIndex, userAnswer, verificationToken } = body;

        if (!sessionId || !testId || questionIndex === undefined || !verificationToken) {
            return NextResponse.json({ 
                error: "Missing required fields" 
            }, { status: 400 });
        }

        const result = verifyAnswer(sessionId, testId, questionIndex, userAnswer, verificationToken);

        if (!result.valid) {
            const reqInfo = extractRequestInfo(request);
            logActivity({
                ...reqInfo,
                type: 'verify_answer_failed',
                isSuspicious: true,
                suspiciousReason: result.error,
                details: { sessionId, testId, questionIndex }
            });

            return NextResponse.json({ 
                error: result.error 
            }, { status: 403 });
        }

        return NextResponse.json({
            correct: result.correct
            // To'g'ri javobni YUBORMAYMIZ - faqat to'g'ri/noto'g'ri
        });

    } catch (error) {
        console.error("Verify answer error:", error);
        return NextResponse.json({ 
            error: "Internal error" 
        }, { status: 500 });
    }
}

/**
 * GET /api/tests/verify?action=results
 * Test tugagandan keyin barcha natijalarni olish
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action !== 'results') {
            return NextResponse.json({ 
                error: "Invalid action" 
            }, { status: 400 });
        }

        const sessionId = searchParams.get('sessionId');
        const testId = searchParams.get('testId');
        const verificationToken = searchParams.get('verificationToken');
        const answersParam = searchParams.get('answers'); // JSON string

        if (!sessionId || !testId || !verificationToken || !answersParam) {
            return NextResponse.json({ 
                error: "Missing required fields" 
            }, { status: 400 });
        }

        let userAnswers;
        try {
            userAnswers = JSON.parse(answersParam);
        } catch {
            return NextResponse.json({ 
                error: "Invalid answers format" 
            }, { status: 400 });
        }

        const results = getTestResults(sessionId, testId, userAnswers, verificationToken);

        if (results.error) {
            const reqInfo = extractRequestInfo(request);
            logActivity({
                ...reqInfo,
                type: 'get_results_failed',
                isSuspicious: true,
                suspiciousReason: results.error,
                details: { sessionId, testId }
            });

            return NextResponse.json({ 
                error: results.error 
            }, { status: 403 });
        }

        return NextResponse.json(results);

    } catch (error) {
        console.error("Get results error:", error);
        return NextResponse.json({ 
            error: "Internal error" 
        }, { status: 500 });
    }
}
