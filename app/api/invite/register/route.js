import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Referral from '@/models/Referral';
import User from '@/models/User';

export async function POST(request) {
  try {
    await dbConnect();
    const { inviteCode, name } = await request.json();

    if (!inviteCode || !name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Invite code and valid name are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const upperCode = inviteCode.toUpperCase().trim();

    // 1. Find the referral
    const referral = await Referral.findOne({
      inviteCode: upperCode,
      status: 'pending',
    });

    if (!referral) {
      return NextResponse.json(
        { success: false, message: 'Invalid or already used invite code' },
        { status: 400 }
      );
    }

    // 2. Prevent same name as inviter
    if (trimmedName.toLowerCase() === referral.inviterName.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'You cannot use the same name as the inviter' },
        { status: 400 }
      );
    }

    // 3. Prevent self-referral (same person registering with their own invite)
    // We can't fully prevent this, but at least check name match

    // 4. Update inviter's stars (+50)
    let inviter = await User.findOne({ userName: referral.inviterName });
    if (!inviter) {
      inviter = await User.create({
        userName: referral.inviterName,
        stars: 100 + referral.bonusStars, // 100 initial + 50 bonus
      });
    } else {
      inviter.stars += referral.bonusStars;
      await inviter.save();
    }

    // 5. Create/update invitee's stars (+50)
    let invitee = await User.findOne({ userName: trimmedName });
    if (!invitee) {
      invitee = await User.create({
        userName: trimmedName,
        stars: 100 + referral.bonusStars, // 100 initial + 50 bonus
      });
    } else {
      // Existing user - still give bonus for using invite
      invitee.stars += referral.bonusStars;
      await invitee.save();
    }

    // 6. Mark referral as completed
    referral.inviteeName = trimmedName;
    referral.status = 'completed';
    referral.completedAt = new Date();
    await referral.save();

    return NextResponse.json({
      success: true,
      message: `Welcome ${trimmedName}! You and ${referral.inviterName} both received +${referral.bonusStars} stars!`,
      inviterName: referral.inviterName,
      bonusStars: referral.bonusStars,
      newStars: invitee.stars,
    });
  } catch (error) {
    console.error('Register Invite Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
