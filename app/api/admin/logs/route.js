import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

function checkAuth(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === ADMIN_SECRET;
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 200);
  const type = searchParams.get('type');
  const ip = searchParams.get('ip');
  const suspicious = searchParams.get('suspicious');
  const search = searchParams.get('search');

  const query = {};
  if (type) query.type = type;
  if (ip) query.ip = ip;
  if (suspicious === 'true') query.isSuspicious = true;
  if (search) {
    query.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { path: { $regex: search, $options: 'i' } },
      { ip: { $regex: search, $options: 'i' } },
      { suspiciousReason: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// Delete logs
export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const clearAll = searchParams.get('clearAll');

  try {
    if (clearAll === 'true') {
      await ActivityLog.deleteMany({});
      return NextResponse.json({ success: true, message: 'All logs cleared' });
    }

    if (id) {
      await ActivityLog.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ID or clearAll required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
