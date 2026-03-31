import { NextResponse } from 'next/server';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

export async function POST(request) {
  try {
    const reqInfo = extractRequestInfo(request);
    const body = await request.json();

    const {
      userId,
      userName,
      testId,
      testName,
      difficulty,
      violationType,
      message,
      attemptsUsed,
      attemptsLeft,
      meta,
    } = body || {};

    await logActivity({
      ...reqInfo,
      type: 'cheat_violation',
      userId: userId || 'anonymous',
      userName: userName || 'Unknown',
      isSuspicious: true,
      suspiciousReason: message || `Cheat violation: ${violationType || 'unknown'}`,
      details: {
        testId,
        testName,
        difficulty,
        violationType: violationType || 'unknown',
        message: message || null,
        attemptsUsed: typeof attemptsUsed === 'number' ? attemptsUsed : null,
        attemptsLeft: typeof attemptsLeft === 'number' ? attemptsLeft : null,
        ...((meta && typeof meta === 'object') ? meta : {}),
      },
      statusCode: 200,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cheat violation log error:', error);
    return NextResponse.json({ error: 'Failed to log cheat violation' }, { status: 500 });
  }
}
