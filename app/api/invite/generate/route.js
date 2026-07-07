import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Referral from '@/models/Referral';

// Generate a unique invite code
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request) {
  try {
    await dbConnect();
    const { name, userId } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Valid name is required (min 2 characters)' },
        { status: 400 }
      );
    }

    // Check if user already has a pending invite code - reuse it
    const existing = await Referral.findOne({
      inviterName: name.trim(),
      status: 'pending',
    }).lean();

    if (existing) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'test-exam.uz';
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
      // Backfill inviterId for legacy referrals
      if (!existing.inviterId && userId) {
        await Referral.updateOne(
          { _id: existing._id },
          { $set: { inviterId: userId } }
        );
      }
      return NextResponse.json({
        success: true,
        inviteCode: existing.inviteCode,
        inviteUrl: `${baseUrl}/?invite=${existing.inviteCode}`,
      });
    }

    // Generate unique invite code
    let inviteCode;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const exists = await Referral.findOne({ inviteCode });
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    const referral = await Referral.create({
      inviteCode,
      inviterName: name.trim(),
      inviterId: userId || null,
      bonusStars: 50,
      status: 'pending',
    });

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'test-exam.uz';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
    return NextResponse.json({
      success: true,
      inviteCode: referral.inviteCode,
      inviteUrl: `${baseUrl}/?invite=${referral.inviteCode}`,
    });
  } catch (error) {
    console.error('Generate Invite Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// GET - check if invite code is valid (for the registration page)
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Invite code is required' },
        { status: 400 }
      );
    }

    const referral = await Referral.findOne({
      inviteCode: code.toUpperCase().trim(),
      status: 'pending',
    }).lean();

    if (!referral) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or already used invite code',
      });
    }

    return NextResponse.json({
      success: true,
      inviteCode: referral.inviteCode,
      inviterName: referral.inviterName,
      inviterId: referral.inviterId || null,
      bonusStars: referral.bonusStars,
    });
  } catch (error) {
    console.error('Check Invite Error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
