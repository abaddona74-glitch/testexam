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
      const showHidden = searchParams.get('showHidden') === 'true';
      const country = searchParams.get('country');
      const region = searchParams.get('region');
      const skip = (page - 1) * limit;

      let dateQuery = {};
      
      // O'zbekiston vaqti bo'yicha "Bugun"ning boshlanishini aniqlash (UTC+5)
      // 1. Hozirgi sanani O'zbekiston vaqti bilan string formatda olamiz (YYYY-MM-DD)
      const uzDateString = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
      
      // 2. Ushbu sana 00:00:00 da O'zbekiston vaqt mintaqasida qaysi UTC vaqtiga to'g'ri kelishini aniqlaymiz
      // Masalan: "2026-01-16T00:00:00+05:00"
      const todayStart = new Date(`${uzDateString}T00:00:00+05:00`);

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

      // Filter out hidden tests if not authorized (Merged after date query)
      if (!showHidden) {
          // Use implicit AND by adding properties
          dateQuery.testId = { $not: { $regex: /hidden/i } };
          dateQuery.testName = { $not: { $regex: /hidden/i } };
      }

      // Exclude study mode from leaderboard
      dateQuery.difficulty = { $ne: 'study' };

      // Region/Country filter
      // Also include old entries that don't have country/region fields yet
        if (country) {
            dateQuery.$or = [
                { country: country },
                { country: { $exists: false } },
                { country: null },
                { country: 'Unknown' }
            ];
        }
        if (region) {
            dateQuery.$or = [
                { region: region },
                { region: { $exists: false } },
                { region: null },
                { region: 'Unknown' }
            ];
        }

      // Get Total Count for Pagination
      const totalDocs = await Leaderboard.countDocuments(dateQuery);

      const leaderboard = await Leaderboard.aggregate([
          { $match: dateQuery },
          {
              $addFields: {
                  percentage: {
                       $cond: [
                           { $eq: ["$total", 0] },
                           0,
                           { $multiply: [{ $divide: ["$score", "$total"] }, 100] }
                       ]
                  },
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
          { $sort: { percentage: -1, difficultyRank: -1, score: -1, duration: 1 } },
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
    const { name, testName, testId, score, total, duration, questions, answers, difficulty, country: bodyCountry, city: bodyCity, region: bodyRegion } = body;
    
    // Do not save 'study' mode results to leaderboard
    if (difficulty === 'study') {
        return NextResponse.json({ message: "Study mode results are not saved" }, { status: 200 });
    }

    if (!name || score === undefined || !total) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    
    // Get region from body (Client detected) OR headers (Vercel/Middleware)
    const country = bodyCountry || request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = bodyCity || request.headers.get('x-vercel-ip-city') || 'Unknown';
    const region = bodyRegion || request.headers.get('x-vercel-ip-region') || 'Unknown';

    const newEntry = await Leaderboard.create({
        name,
        testName,
        testId,
        score,
        total,
        date: new Date(),
        duration,
        questions, 
        answers,
        difficulty,
        country,
        city,
        region
    });
    
    return NextResponse.json(newEntry);
  } catch (error) {
    console.error("Leaderboard POST Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await Leaderboard.deleteMany({ name });
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Leaderboard DELETE Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
