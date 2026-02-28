import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';

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

    const comment = await Comment.create({
      testId,
      userName,
      text: text.trim(),
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
