import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import { filterProfanity } from '../../../lib/profanity';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { deepScanForInjection, detectDDoS } from '../../../lib/security';
import { sanitizePlainText } from '../../../lib/sanitize';
import { isUserNameBlocked, loadBlockedCache, getUserNameBlockReason } from '../admin/block/route';

const MAX_COMMENT_LENGTH = 5000;

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

    // Filter profanity on read (catches old unfiltered messages too)
    const filtered = comments.map(c => ({
      ...c,
      userName: filterProfanity(sanitizePlainText(c.userName)),
      text: filterProfanity(sanitizePlainText(c.text)),
    }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const testId = sanitizePlainText(body?.testId);
    const userName = sanitizePlainText(body?.userName);
    const text = sanitizePlainText(body?.text);

    if (!testId || !userName || !text || !text.trim()) {
      return NextResponse.json({ error: 'testId, userName, and text required' }, { status: 400 });
    }

    if (text.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comment too long (max ${MAX_COMMENT_LENGTH} chars)` }, { status: 400 });
    }

    const reqInfo = extractRequestInfo(request);

    if (!global._blockedCache?.loaded) {
      await loadBlockedCache();
    }

    if (isUserNameBlocked(userName)) {
      const blockReason = getUserNameBlockReason(userName);
      logActivity({
        ...reqInfo,
        type: 'blocked_comment_attempt',
        userName,
        isSuspicious: true,
        suspiciousReason: 'Blocked user attempted to post comment',
        details: { testId, reason: blockReason },
      });
      return NextResponse.json({
        error: 'User is blocked from commenting',
        reason: blockReason || 'Blocked by admin',
      }, { status: 403 });
    }

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
