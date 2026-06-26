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

    let user = await User.findOne({ userName: name.trim() }).lean();

    if (!user) {
      // Auto-create user with 100 initial stars
      user = await User.create({
        userName: name.trim(),
        stars: 100,
      });
      user = user.toObject();
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

    let user = await User.findOne({ userName: name.trim() });

    if (!user) {
      user = await User.create({
        userName: name.trim(),
        stars: 100,
      });
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount)) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (operation === 'add') {
      user.stars += numAmount;
      if (user.stars < 0) user.stars = 0;
      await user.save();
    } else if (operation === 'spend') {
      if (user.stars < numAmount) {
        return NextResponse.json(
          { success: false, message: 'Not enough stars' },
          { status: 400 }
        );
      }
      user.stars -= numAmount;
      if (user.stars < 0) user.stars = 0;
      await user.save();
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid operation. Use "add" or "spend"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      stars: user.stars,
    });
  } catch (error) {
    console.error('Update Stars Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
