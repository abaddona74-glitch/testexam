import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ChatMessage from '@/models/ChatMessage';
import Comment from '@/models/Comment';
import { logActivity } from '@/lib/activity-logger';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

function checkAuth(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === ADMIN_SECRET;
}

// GET - List chat messages or comments
export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'chat'; // 'chat' or 'comments'
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 200);
  const search = searchParams.get('search');

  try {
    if (source === 'chat') {
      const query = {};
      if (search) {
        query.$or = [
          { sender: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ];
      }

      const [messages, total] = await Promise.all([
        ChatMessage.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ChatMessage.countDocuments(query),
      ]);

      return NextResponse.json({
        items: messages,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } else {
      const query = {};
      if (search) {
        query.$or = [
          { userName: { $regex: search, $options: 'i' } },
          { text: { $regex: search, $options: 'i' } },
        ];
      }

      const [comments, total] = await Promise.all([
        Comment.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Comment.countDocuments(query),
      ]);

      return NextResponse.json({
        items: comments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// DELETE - Delete chat message or comment
export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'chat';
  const id = searchParams.get('id');
  const clearAll = searchParams.get('clearAll');

  try {
    if (clearAll === 'true') {
      if (source === 'chat') {
        const result = await ChatMessage.deleteMany({});
        await logActivity({ type: 'admin_action', details: { action: 'clear_all_chat', count: result.deletedCount } });
        return NextResponse.json({ success: true, deleted: result.deletedCount });
      } else {
        const result = await Comment.deleteMany({});
        await logActivity({ type: 'admin_action', details: { action: 'clear_all_comments', count: result.deletedCount } });
        return NextResponse.json({ success: true, deleted: result.deletedCount });
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (source === 'chat') {
      await ChatMessage.findByIdAndDelete(id);
      await logActivity({ type: 'admin_action', details: { action: 'delete_chat', messageId: id } });
    } else {
      await Comment.findByIdAndDelete(id);
      await logActivity({ type: 'admin_action', details: { action: 'delete_comment', commentId: id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
