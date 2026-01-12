import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Leaderboard from '../../../models/Leaderboard';

export async function GET(request) {
  await dbConnect();
  try {
      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 100;
      const skip = (page - 1) * limit;

      let dateQuery = {};
      const now = new Date();
      // Set to beginning of today (00:00:00)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (period === 'today') {
          dateQuery = { date: { $gte: todayStart } };
      } else if (period === '3days') {
          const threeDaysAgo = new Date(todayStart);
          threeDaysAgo.setDate(todayStart.getDate() - 2); // Includes today + 2 previous days
          dateQuery = { date: { $gte: threeDaysAgo } };
      } else if (period === '7days') {
          const sevenDaysAgo = new Date(todayStart);
          sevenDaysAgo.setDate(todayStart.getDate() - 6); // Includes today + 6 previous days
          dateQuery = { date: { $gte: sevenDaysAgo } };
      }

      // Get Total Count for Pagination
      const totalDocs = await Leaderboard.countDocuments(dateQuery);

      const leaderboard = await Leaderboard.aggregate([
          { $match: dateQuery },
          {
              $addFields: {
                  difficultyRank: {
                      $switch: {
                          branches: [
                              { case: { $eq: ["$difficulty", "impossible"] }, then: 5 },
                              { case: { $eq: ["$difficulty", "insane"] }, then: 4 },
                              { case: { $eq: ["$difficulty", "hard"] }, then: 3 },
                              { case: { $eq: ["$difficulty", "middle"] }, then: 2 },
                              { case: { $eq: ["$difficulty", "easy"] }, then: 1 }
                          ],
                          default: 0
                      }
                  }
              }
          },
          { $sort: { score: -1, difficultyRank: -1, duration: 1 } },
          { $skip: skip },
          { $limit: limit }
      ]);
      
      return NextResponse.json({
          data: leaderboard,
          pagination: {
              total: totalDocs,
              page,
              limit,
              totalPages: Math.ceil(totalDocs / limit)
          }
      });
  } catch (error) {
      console.error("Leaderboard GET Error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}

export async function POST(request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { name, testName, score, total, duration, questions, answers, difficulty } = body;
    
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
        answers,
        difficulty
    });
    
    return NextResponse.json(newEntry);
  } catch (error) {
    console.error("Leaderboard POST Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
