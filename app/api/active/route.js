import { NextResponse } from 'next/server';

// Store active sessions in memory
// We now use sessionId as key to support multiple tabs without race conditions
// Key: sessionId (or userId if fallback), Value: { ... }
if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('testId');
  
  const now = Date.now();
  // Cleanup stale sessions.
  const BROWSING_TTL_MS = 30 * 1000; // 30 seconds
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

  // Get all active sessions
  let sessions = Object.values(activeSessions);

  // If specific test requested, filter by it
  if (testId) {
      sessions = sessions.filter(s => s.testId === testId);
  }

  // Deduplicate by userId
  const uniqueUsers = {};
  sessions.forEach(session => {
      const existing = uniqueUsers[session.userId];
      if (!existing) {
          uniqueUsers[session.userId] = session;
      } else {
          // Priority: in-test > browsing > afk
          const score = (s) => (s.status === 'in-test' ? 3 : s.status === 'browsing' ? 2 : 1);
          if (score(session) > score(existing)) {
              uniqueUsers[session.userId] = session;
          } else if (score(session) === score(existing)) {
               // Use latest
               if (session.lastUpdated > existing.lastUpdated) {
                   uniqueUsers[session.userId] = session;
               }
          }
      }
  });

  return NextResponse.json(Object.values(uniqueUsers));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { testId, userId, sessionId, name, progress, total, status, device, country, currentAnswer, stars, theme, questionId, visualState } = body; 
    
    // Key by sessionId to ensure multiple tabs don "t conflict (race condition on reload)
    // Fallback to userId for backward compatibility
    const key = sessionId || userId; 

    activeSessions[key] = {
        testId, // can be null if just browsing
        userId,
        sessionId,
        name,
        progress: progress || 0,
        total: total || 0,
        status: status || (testId ? 'in-test' : 'browsing'),
        device: device || 'desktop', 
        country: country || null,
        currentAnswer: currentAnswer || null,
        visualState: visualState || null,
        stars: stars || 0,
        theme: theme || 'light',
        questionId: questionId || null,
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
    const sessionId = searchParams.get('sessionId');

    // Prefer deleting by specific sessionId
    if (sessionId && activeSessions[sessionId]) {
        delete activeSessions[sessionId];
    } 
    // Fallback: Delete all sessions for this userId
    else if (userId) {
         Object.keys(activeSessions).forEach(key => {
            if (activeSessions[key].userId === userId) {
                 delete activeSessions[key];
            }
         });
    }
    
    return NextResponse.json({ success: true });
}
