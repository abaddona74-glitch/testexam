import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import ChatMessage from '../../../models/ChatMessage';
import { filterProfanity } from '../../../lib/profanity';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { deepScanForInjection, detectDDoS } from '../../../lib/security';
import { sanitizePlainText } from '../../../lib/sanitize';
import { isUserNameBlocked, loadBlockedCache, getUserNameBlockReason } from '../admin/block/route';

const MAX_CHAT_MESSAGE_LENGTH = 5000;

export async function GET(request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const type = searchParams.get('type') || 'public'; // 'public' | 'dm'
    const partner = searchParams.get('partner'); // for DM conversations
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100);
    const before = searchParams.get('before'); // cursor-based pagination

    let query = {};

    if (type === 'dm' && user && partner) {
      // Get DM conversation between two users
      query = {
        type: 'dm',
        $or: [
          { sender: user, recipient: partner },
          { sender: partner, recipient: user },
        ],
      };
    } else {
      // Public messages
      query = { type: 'public' };
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Filter profanity on read (catches old unfiltered messages too)
    const filtered = messages.map(msg => ({
      ...msg,
      sender: filterProfanity(sanitizePlainText(msg.sender)),
      message: filterProfanity(sanitizePlainText(msg.message)),
    }));

    return NextResponse.json(filtered.reverse());
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const senderRaw = body?.sender;
    const messageRaw = body?.message;
    const recipientRaw = body?.recipient;
    const type = body?.type;

    const sender = sanitizePlainText(senderRaw);
    const message = sanitizePlainText(messageRaw);
    const recipient = sanitizePlainText(recipientRaw);

    if (!sender || !message || !message.trim()) {
      return NextResponse.json({ error: 'Sender and message required' }, { status: 400 });
    }

    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_CHAT_MESSAGE_LENGTH} chars)` }, { status: 400 });
    }

    const reqInfo = extractRequestInfo(request);

    if (!global._blockedCache?.loaded) {
      await loadBlockedCache();
    }

    if (isUserNameBlocked(sender)) {
      const blockReason = getUserNameBlockReason(sender);
      logActivity({
        ...reqInfo,
        type: 'blocked_chat_attempt',
        userName: sender,
        isSuspicious: true,
        suspiciousReason: 'Blocked user attempted to send chat message',
        details: { chatType: type || 'public', reason: blockReason },
      });
      return NextResponse.json({
        error: 'User is blocked from chatting',
        reason: blockReason || 'Blocked by admin',
      }, { status: 403 });
    }

    // Security: Check for injection attempts
    const injections = deepScanForInjection({ sender, message, recipient });
    if (injections.length > 0) {
      logActivity({
        ...reqInfo, type: 'injection_attempt', userName: sender,
        isSuspicious: true, suspiciousReason: `Chat injection: ${injections[0].type} in ${injections[0].field}`,
        details: { injections },
      });
    }

    // DDoS check
    const ddos = detectDDoS(reqInfo.ip);
    if (ddos.isDDoS) {
      logActivity({
        ...reqInfo, type: 'dos_attempt', userName: sender,
        isSuspicious: true, suspiciousReason: `DoS: ${ddos.requestCount} req/min (${ddos.level})`,
      });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Apply profanity filter
    const filteredMessage = filterProfanity(message.trim());

    const chatMessage = await ChatMessage.create({
      sender: filterProfanity(sender),
      message: filteredMessage,
      recipient: type === 'dm' ? recipient : 'all',
      type: type || 'public',
    });

    // Log activity
    logActivity({
      ...reqInfo, type: 'chat_message', userName: sender,
      details: { messageLength: message.length, chatType: type || 'public' },
    });

    return NextResponse.json(chatMessage, { status: 201 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
