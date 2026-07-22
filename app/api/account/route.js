import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import ProgressBackup from '@/models/ProgressBackup';
import ProgressOtp from '@/models/ProgressOtp';

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';
  return cleaned;
}

function hashCode(email, code) {
  const secret = process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || 'local-otp-secret';
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

async function sendEmail({ to, code, purpose }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const label = purpose === 'transfer' ? 'Account Transfer' : 'Unlink Account';
  await transporter.sendMail({
    from: `"ExamTest" <${from}>`,
    to,
    subject: `ExamTest ${label} Verification Code`,
    text: `Your verification code is: ${code}\n\nIt expires in 5 minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px">
      <h2 style="color:#059669">ExamTest ${label}</h2>
      <p style="font-size:16px;color:#333">Your verification code:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#059669;text-align:center;padding:16px;background:#f0fdf4;border-radius:8px">${code}</div>
      <p style="color:#666;font-size:13px;margin-top:16px">This code expires in 5 minutes.</p>
    </div>`,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action;
    const userName = String(body.userName || '').trim();

    if (!userName) {
      return NextResponse.json({ success: false, message: 'userName is required' }, { status: 400 });
    }

    await dbConnect();

    // ─── UNLINK ───────────────────────────────────────────────
    if (action === 'unlink') {
      const updated = await ProgressBackup.findOneAndUpdate(
        { userName },
        { $unset: { email: '', phone: '' }, $set: { contactType: 'phone', updatedAt: new Date() } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { userName },
        { $set: { email: '' } }
      );
      console.log('[account] unlinked:', { userName, hadBackup: !!updated });
      return NextResponse.json({ success: true, message: 'Account unlinked successfully' });
    }

    // ─── TRANSFER: send OTP to new email ──────────────────────
    if (action === 'transfer-send') {
      const newEmail = normalizeEmail(body.newEmail);
      if (!newEmail) {
        return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 });
      }

      const existing = await ProgressBackup.findOne({ email: newEmail }).lean();
      if (existing) {
        return NextResponse.json({ success: false, alreadyLinked: true, message: 'This email is already linked to another account' }, { status: 409 });
      }

      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      await ProgressOtp.deleteMany({ email: newEmail, purpose: 'transfer' });
      await ProgressOtp.create({
        email: newEmail,
        contactType: 'email',
        codeHash: hashCode(newEmail, code),
        purpose: 'transfer',
        payload: { userName },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await sendEmail({ to: newEmail, code, purpose: 'transfer' });
      return NextResponse.json({ success: true, message: 'Verification code sent to new email' });
    }

    // ─── TRANSFER: verify OTP and update email ────────────────
    if (action === 'transfer-verify') {
      const newEmail = normalizeEmail(body.newEmail);
      const code = String(body.code || '').trim();

      if (!newEmail || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ success: false, message: 'Invalid email or verification code' }, { status: 400 });
      }

      const otp = await ProgressOtp.findOne({ email: newEmail, purpose: 'transfer' });
      if (!otp || otp.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ success: false, message: 'Verification code expired' }, { status: 400 });
      }
      if (otp.attempts >= 5) {
        await ProgressOtp.deleteOne({ _id: otp._id });
        return NextResponse.json({ success: false, message: 'Too many attempts' }, { status: 429 });
      }
      if (otp.codeHash !== hashCode(newEmail, code)) {
        otp.attempts += 1;
        await otp.save();
        return NextResponse.json({ success: false, message: 'Incorrect verification code' }, { status: 400 });
      }

      await ProgressOtp.deleteOne({ _id: otp._id });

      await ProgressBackup.findOneAndUpdate(
        { userName },
        { $set: { email: newEmail, contactType: 'email', updatedAt: new Date() }, $unset: { phone: '' } }
      );
      await User.findOneAndUpdate(
        { userName },
        { $set: { email: newEmail } }
      );

      return NextResponse.json({ success: true, message: 'Account transferred to new email' });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[account] error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}