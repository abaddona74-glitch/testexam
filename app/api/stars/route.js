import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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

    const trimmedName = name.trim();

    // Atomic upsert to avoid race conditions with concurrent requests
    const user = await User.findOneAndUpdate(
      { userName: trimmedName },
      {
        $setOnInsert: { stars: 100, userName: trimmedName },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );

    // Migration fix: existing users with 0 stars get 100 bonus
    if (user.stars === 0) {
      await User.updateOne({ userName: trimmedName }, { $set: { stars: 100 } });
      user.stars = 100;
    }

    // Determine if user can spin today
    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const canSpin = user.lastSpinDate !== todayStr;

    return NextResponse.json({
      success: true,
      userName: user.userName,
      stars: user.stars,
      lastSpinDate: user.lastSpinDate,
      canSpinToday: canSpin,
    });
  } catch (error) {
    console.error('Get Stars Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - update stars (for spend operations like paid spin, test rewards, etc.)
export async function POST(request) {
  try {
    await dbConnect();
    const { name, amount, operation } = await request.json();

    if (!name || amount === undefined || !operation) {
      return NextResponse.json(
        { success: false, message: 'name, amount, and operation are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount)) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (operation === 'add') {
      // Atomic upsert with aggregation pipeline:
      // New user gets 100 + amount, existing user gets current + amount, floor at 0
      const result = await User.findOneAndUpdate(
        { userName: trimmedName },
        [
          {
            $set: {
              stars: {
                $max: [
                  { $add: [{ $ifNull: ['$stars', 100] }, numAmount] },
                  0
                ]
              }
            }
          }
        ],
        { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        success: true,
        stars: result.stars,
      });
    } else if (operation === 'spend') {
      // Step 1: Ensure user exists (atomic upsert with defaults)
      const user = await User.findOneAndUpdate(
        { userName: trimmedName },
        { $setOnInsert: { stars: 100, userName: trimmedName } },
        { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
      );

      // Step 2: Check balance
      if (user.stars < numAmount) {
        return NextResponse.json(
          { success: false, message: 'Not enough stars' },
          { status: 400 }
        );
      }

      // Step 3: Atomic decrement with balance guard (won't go below 0)
      const updated = await User.findOneAndUpdate(
        { userName: trimmedName, stars: { $gte: numAmount } },
        { $inc: { stars: -numAmount } },
        { new: true, lean: true }
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Not enough stars (concurrent spend)' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        stars: updated.stars,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid operation. Use "add" or "spend"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update Stars Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
