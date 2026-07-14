import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Referral from '@/models/Referral';
import User from '@/models/User';

export async function POST(request) {
  try {
    await dbConnect();
    const { inviteCode, name, userId } = await request.json();

    if (!inviteCode || !name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invite code and valid name are required' },
        { status: 400 }
      );
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return NextResponse.json(
        { success: false, message: 'Name must be 2–20 characters' },
        { status: 400 }
      );
    }

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

    // 2. Prevent self-referral: same user cannot use their own invite
    // Use userId (unique per device) if available; fall back to name match for legacy referrals
    if (referral.inviterId && userId && referral.inviterId === userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot use your own invite link' },
        { status: 400 }
      );
    }
    // Legacy check for referrals created without userId
    if (!referral.inviterId && trimmedName.toLowerCase() === referral.inviterName.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'You cannot use the same name as the inviter' },
        { status: 400 }
      );
    }

    // 3. Atomic update: add bonus stars to inviter (or create with 100 + bonus)
    const inviter = await User.findOneAndUpdate(
      { userName: referral.inviterName },
      { $inc: { stars: referral.bonusStars } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );

    // 4. Atomic update: add bonus stars to invitee (or create with 100 + bonus)
    const invitee = await User.findOneAndUpdate(
      { userName: trimmedName },
      { $inc: { stars: referral.bonusStars } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true }
    );

    // 5. Mark referral as completed
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
