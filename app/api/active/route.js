import { NextResponse } from 'next/server';

// Store active sessions in memory
// Key: testId + userId, Value: { name, progress, lastUpdated }
// Use global to persist across hot reloads in dev
if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('testId');
  
  const now = Date.now();
  // Cleanup stale sessions.
  // Mobile browsers may keep tabs open in background without reliably firing beforeunload,
  // so we expire users based on lastUpdated.
  const BROWSING_TTL_MS = 15 * 1000; // 15 seconds
  const AFK_TTL_MS = 2 * 60 * 1000; // 2 minutes
  const IN_TEST_TTL_MS = 3 * 60 * 1000; // 3 minutes

  Object.keys(activeSessions).forEach(key => {
    const session = activeSessions[key];
    const ttl = session?.status === 'afk'
      ? AFK_TTL_MS
      : (session?.status === 'in-test' || session?.testId) ? IN_TEST_TTL_MS : BROWSING_TTL_MS;
    if (!session?.lastUpdated || (now - session.lastUpdated > ttl)) {
      delete activeSessions[key];
    }
  });

  if (!testId) {
      // Return all active users across all tests
      return NextResponse.json(Object.values(activeSessions));
  }

  // Filter by testId
  const result = Object.values(activeSessions).filter(s => s.testId === testId);
  return NextResponse.json(result);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { testId, userId, name, progress, total, status, device, country, currentAnswer, stars, theme } = body; 
    
    // Key by userId to ensure user appears only once
    const key = userId; 

    activeSessions[key] = {
        testId, // can be null if just browsing
        userId,
        name,
        progress: progress || 0,
        total: total || 0,
        status: status || (testId ? 'in-test' : 'browsing'),
        device: device || 'desktop', 
        country: country || null,
        currentAnswer: currentAnswer || null,
        stars: stars || 0,
        theme: theme || 'light',
        lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
        // Direct delete by userId key
        if (activeSessions[userId]) {
            delete activeSessions[userId];
        }
    }
    
    return NextResponse.json({ success: true });
}
