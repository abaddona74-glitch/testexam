import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import { filterProfanity } from '../../../lib/profanity';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { deepScanForInjection, detectDDoS } from '../../../lib/security';

export async function GET(request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    if (!testId) {
      return NextResponse.json({ error: 'testId required' }, { status: 400 });
    }

    const countOnly = searchParams.get('countOnly');
    if (countOnly === 'true') {
      const count = await Comment.countDocuments({ testId });
      return NextResponse.json({ count });
    }

    const comments = await Comment.find({ testId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { testId, userName, text } = body;

    if (!testId || !userName || !text || !text.trim()) {
      return NextResponse.json({ error: 'testId, userName, and text required' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 });
    }

    const reqInfo = extractRequestInfo(request);

    // Security: Check for injection
    const injections = deepScanForInjection({ testId, userName, text });
    if (injections.length > 0) {
      logActivity({
        ...reqInfo, type: 'injection_attempt', userName,
        isSuspicious: true, suspiciousReason: `Comment injection: ${injections[0].type} in ${injections[0].field}`,
        details: { injections, testId },
      });
    }

    // DDoS check
    const ddos = detectDDoS(reqInfo.ip);
    if (ddos.isDDoS) {
      logActivity({
        ...reqInfo, type: 'dos_attempt', userName,
        isSuspicious: true, suspiciousReason: `DoS: ${ddos.requestCount} req/min`,
      });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Apply profanity filter
    const comment = await Comment.create({
      testId,
      userName: filterProfanity(userName),
      text: filterProfanity(text.trim()),
    });

    // Log activity
    logActivity({
      ...reqInfo, type: 'comment_post', userName,
      details: { testId, textLength: text.length },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
