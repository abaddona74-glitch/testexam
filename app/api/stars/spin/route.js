import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// Spin prize configuration - same as client-side SPINNER_ITEMS
const SPINNER_ITEMS = [
  { id: 's20', label: '+20 Stars', type: 'star', amount: 20, probability: 0.2 },
  { id: 'e1', label: 'Try Again', type: 'empty', probability: 0.2 },
  { id: 'h5', label: '+5 Hints', type: 'hint', amount: 5, probability: 0.15 },
  { id: 'e2', label: 'Try Again', type: 'empty', probability: 0.15 },
  { id: 's45', label: '+45 Stars', type: 'star', amount: 45, probability: 0.12 },
  { id: 'e3', label: 'Try Again', type: 'empty', probability: 0.08 },
  { id: 's100', label: '+100 Stars', type: 'star', amount: 100, probability: 0.07 },
  { id: 'h15', label: '+15 Hints', type: 'hint', amount: 15, probability: 0.03 },
];

function getRandomPrize(forceLucky = false) {
  if (forceLucky) {
    const luckyItems = SPINNER_ITEMS.filter(i => i.type !== 'empty');
    return luckyItems[Math.floor(Math.random() * luckyItems.length)];
  }

  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < SPINNER_ITEMS.length; i++) {
    cumulative += SPINNER_ITEMS[i].probability;
    if (rand <= cumulative) {
      return SPINNER_ITEMS[i];
    }
  }
  return SPINNER_ITEMS[SPINNER_ITEMS.length - 1];
}

// POST - execute a spin (free or paid)
export async function POST(request) {
  try {
    await dbConnect();
    const { name, type, forceLucky } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { success: false, message: 'name and type (free/paid) are required' },
        { status: 400 }
      );
    }

    // Atomic upsert: ensure user exists
    const user = await User.findOneAndUpdate(
      { userName: name.trim() },
      { $setOnInsert: { stars: 100, userName: name.trim() } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: false }
    );

    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    if (type === 'free') {
      // Daily free spin check
      if (user.lastSpinDate === todayStr) {
        return NextResponse.json({
          success: false,
          message: 'You already used your free spin today',
          canSpinToday: false,
        });
      }

      // Mark today's spin as used (in-memory only, save at end)
      user.lastSpinDate = todayStr;

      const prize = getRandomPrize(forceLucky);

      // Apply star prizes (in-memory only)
      if (prize.type === 'star') {
        user.stars += prize.amount;
      }

      // Single atomic save - prevents Mongoose VersionError from double-save
      await user.save();

      return NextResponse.json({
        success: true,
        prize,
        stars: user.stars,
        canSpinToday: false,
      });
    } else if (type === 'paid') {
      // Paid spin costs 10 stars - always gives a non-empty prize (forceLucky)
      if (user.stars < 10) {
        return NextResponse.json({
          success: false,
          message: 'Not enough stars',
        });
      }

      // Get guaranteed prize and calculate net star change
      const prize = getRandomPrize(true); // Paid spins always win something

      let starDelta = prize.type === 'star' ? prize.amount : 0;
      let netChange = starDelta - 10;

      // Apply all changes in memory, then single save
      user.stars += netChange;
      await user.save();

      return NextResponse.json({
        success: true,
        prize,
        stars: user.stars,
        canSpinToday: user.lastSpinDate !== todayStr,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid spin type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Spin Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// GET - check spin status
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      );
    }

    // Atomic upsert with lean: returns plain object, creates if not exists
    const user = await User.findOneAndUpdate(
      { userName: name.trim() },
      { $setOnInsert: { stars: 100, userName: name.trim() } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const canSpinToday = user.lastSpinDate !== todayStr;

    return NextResponse.json({
      success: true,
      stars: user.stars,
      canSpinToday,
      lastSpinDate: user.lastSpinDate,
    });
  } catch (error) {
    console.error('Spin Status Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
