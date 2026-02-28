import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import ChatMessage from '../../../models/ChatMessage';

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

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { sender, message, recipient, type } = body;

    if (!sender || !message || !message.trim()) {
      return NextResponse.json({ error: 'Sender and message required' }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    const chatMessage = await ChatMessage.create({
      sender,
      message: message.trim(),
      recipient: type === 'dm' ? recipient : 'all',
      type: type || 'public',
    });

    return NextResponse.json(chatMessage, { status: 201 });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
