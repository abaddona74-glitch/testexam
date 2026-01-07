import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'leaderboard.json');

// In-memory fallback for Vercel/Serverless where FS is read-only
let dbCache = null;

function getLeaderboard() {
    if (dbCache) return dbCache;

    try {
        if (!fs.existsSync(DB_PATH)) {
            dbCache = [];
            return [];
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        dbCache = JSON.parse(data);
        return dbCache;
    } catch (e) {
        console.error("Read error or parsing error:", e);
        dbCache = [];
        return [];
    }
}

function saveLeaderboard(data) {
    dbCache = data;
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.warn("Write failed (likely read-only FS on Vercel). Data saved to memory only.", e);
    }
}

export async function GET() {
  const leaderboard = getLeaderboard();
  // Return sorted by score (descending)
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  return NextResponse.json(sorted);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, testName, score, total, duration, questions, answers } = body;
    
    if (!name || score === undefined || !total) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const leaderboard = getLeaderboard();
    const newEntry = {
        id: Date.now().toString(),
        name,
        testName,
        score,
        total,
        date: new Date().toISOString(),
        duration,
        questions, // Save snapshot of questions for review
        answers   // Save user answers
    };
    
    leaderboard.push(newEntry);
    saveLeaderboard(leaderboard);
    
    return NextResponse.json(newEntry);    
    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
