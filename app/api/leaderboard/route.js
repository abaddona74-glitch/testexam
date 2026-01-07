import { NextResponse } from 'next/server';

let leaderboard = [];

export async function GET() {
  // Return sorted by score (descending)
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  return NextResponse.json(sorted);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, testName, score, total } = body;
    
    if (!name || score === undefined || !total) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const newEntry = {
        id: Date.now().toString(),
        name,
        testName,
        score,
        total,
        date: new Date().toISOString()
    };
    
    leaderboard.push(newEntry);
    
    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
