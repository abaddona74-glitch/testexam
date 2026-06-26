import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// Spin prize configuration - same as client-side SPINNER_ITEMS
const SPINNER_ITEMS = [
  { id: 'h10', label: '+10 Hints', type: 'hint', amount: 10, probability: 0.1 },
  { id: 'e1', label: 'Try Again', type: 'empty', probability: 0.1 },
  { id: 'h20', label: '+20 Hints', type: 'hint', amount: 20, probability: 0.05 },
  { id: 'e2', label: 'Try Again', type: 'empty', probability: 0.1 },
  { id: 's25', label: '+25 Stars', type: 'star', amount: 25, probability: 0.15 },
  { id: 'e3', label: 'Try Again', type: 'empty', probability: 0.1 },
  { id: 's50', label: '+50 Stars', type: 'star', amount: 50, probability: 0.1 },
  { id: 'e4', label: 'Try Again', type: 'empty', probability: 0.1 },
  { id: 's100', label: '+100 Stars', type: 'star', amount: 100, probability: 0.02 },
  { id: 'e5', label: 'Try Again', type: 'empty', probability: 0.08 },
  { id: 'm2x', label: '2x (1h)', type: 'multiplier', val: 2, duration: 3600000, probability: 0.05 },
  { id: 'e6', label: 'Try Again', type: 'empty', probability: 0.1 },
  { id: 'm3x', label: '3x (15m)', type: 'multiplier', val: 3, duration: 900000, probability: 0.02 },
  { id: 'e7', label: 'Try Again', type: 'empty', probability: 0.08 },
  { id: 's10', label: '+10 Stars', type: 'star', amount: 10, probability: 0.1 },
  { id: 'e8', label: 'Try Again', type: 'empty', probability: 0.1 },
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

    let user = await User.findOne({ userName: name.trim() });

    if (!user) {
      user = await User.create({
        userName: name.trim(),
        stars: 100,
      });
    }

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

      // Mark today's spin as used
      user.lastSpinDate = todayStr;
      await user.save();

      const prize = getRandomPrize(forceLucky);

      // Apply star prizes directly
      if (prize.type === 'star') {
        user.stars += prize.amount;
        await user.save();
      }

      return NextResponse.json({
        success: true,
        prize,
        stars: user.stars,
        canSpinToday: false,
      });
    } else if (type === 'paid') {
      // Paid spin costs 10 stars
      if (user.stars < 10) {
        return NextResponse.json({
          success: false,
          message: 'Not enough stars',
        });
      }

      user.stars -= 10;
      const prize = getRandomPrize(forceLucky);

      // Apply star prizes directly
      if (prize.type === 'star') {
        user.stars += prize.amount;
      }

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

    let user = await User.findOne({ userName: name.trim() }).lean();

    if (!user) {
      user = { userName: name.trim(), stars: 100, lastSpinDate: null };
    }

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
