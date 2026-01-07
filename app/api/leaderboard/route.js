import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Leaderboard from '../../../models/Leaderboard';

export async function GET() {
  await dbConnect();
  try {
      const leaderboard = await Leaderboard.find({}).sort({ score: -1 }).limit(100);
      return NextResponse.json(leaderboard);
  } catch (error) {
      console.error("Leaderboard GET Error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { name, testName, score, total, duration, questions, answers } = body;
    
    if (!name || score === undefined || !total) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const newEntry = await Leaderboard.create({
        name,
        testName,
        score,
        total,
        date: new Date(),
        duration,
        questions, 
        answers   
    });
    
    return NextResponse.json(newEntry);
  } catch (error) {
    console.error("Leaderboard POST Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
