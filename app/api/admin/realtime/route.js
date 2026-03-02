import { NextResponse } from 'next/server';
import { getEventsSince } from '@/lib/activity-logger';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

/**
 * Real-time events endpoint — admin polls this every 3 seconds.
 * Returns only NEW events since lastEventId (from in-memory bus, no DB).
 * This is instant because it reads from memory, not MongoDB.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sinceId = parseInt(searchParams.get('since')) || 0;
  
  // Read from in-memory event bus (instant, no DB call)
  const { events, lastEventId } = getEventsSince(sinceId);
  
  // Also get current active sessions from memory
  const activeSessions = global.activeSessions ? Object.values(global.activeSessions) : [];
  
  // Count summary from new events
  const summary = {};
  for (const e of events) {
    summary[e.type] = (summary[e.type] || 0) + 1;
  }

  return NextResponse.json({
    events,
    lastEventId,
    activeUsers: activeSessions.length,
    activeSessions,
    summary,
    serverTime: Date.now(),
  });
}
