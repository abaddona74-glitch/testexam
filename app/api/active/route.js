import { NextResponse } from 'next/server';

// Store active sessions in memory
// Key: testId + userId, Value: { name, progress, lastUpdated }
let activeSessions = {};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('testId');
  
  const now = Date.now();
  // Cleanup old sessions (> 5 minutes inactive)
  Object.keys(activeSessions).forEach(key => {
      if (now - activeSessions[key].lastUpdated > 5 * 60 * 1000) {
          delete activeSessions[key];
      }
  });

  if (!testId) return NextResponse.json([]);

  // Filter by testId
  const result = Object.values(activeSessions).filter(s => s.testId === testId);
  return NextResponse.json(result);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { testId, userId, name, progress, total } = body; // progress is index

    const key = `${testId}-${userId}`; // Simple key
    activeSessions[key] = {
        testId,
        userId,
        name,
        progress,
        total,
        lastUpdated: Date.now()
    };

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const userId = searchParams.get('userId');

    if (testId && userId) {
        const key = `${testId}-${userId}`; // Simple key must match POST
        delete activeSessions[key];
    }
    
    return NextResponse.json({ success: true });
}
