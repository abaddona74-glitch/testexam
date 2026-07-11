import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import ProgressBackup from '@/models/ProgressBackup';
import ProgressOtp from '@/models/ProgressOtp';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_PROGRESS_BYTES = 500 * 1024;
const MAX_ATTEMPTS = 5;

function normalizePhone(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) return '';
  const digits = cleaned.slice(1).replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return `+${digits}`;
}

function hashCode(phone, code) {
  const secret = process.env.OTP_SECRET || process.env.NEXTAUTH_SECRET || process.env.HTTPSMS_API_KEY || 'local-otp-secret';
  return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

function getProgressSize(progress) {
  try {
    return Buffer.byteLength(JSON.stringify(progress || {}), 'utf8');
  } catch {
    return MAX_PROGRESS_BYTES + 1;
  }
}

async function sendSms({ to, code, purpose }) {
  const apiKey = process.env.HTTPSMS_API_KEY;
  const from = process.env.HTTPSMS_FROM;

  if (!apiKey || !from) {
    throw new Error('HTTPSMS_API_KEY and HTTPSMS_FROM are required');
  }

  const action = purpose === 'restore' ? 'restore' : 'save';
  const res = await fetch('https://api.httpsms.com/v1/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      from,
      to,
      content: `ExamTest ${action} verification code: ${code}. It expires in 5 minutes.`,
      request_id: crypto.randomUUID(),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`httpSMS failed: ${res.status} ${body}`);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const purpose = body.purpose === 'restore' ? 'restore' : 'save';
    const phone = normalizePhone(body.phone);

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number must be in international format, e.g. +998901234567' }, { status: 400 });
    }

    if (purpose === 'save' && getProgressSize(body.progress) > MAX_PROGRESS_BYTES) {
      return NextResponse.json({ success: false, message: 'Progress data is too large to save' }, { status: 413 });
    }

    await dbConnect();

    if (purpose === 'restore') {
      const backup = await ProgressBackup.findOne({ phone }).lean();
      if (!backup) {
        return NextResponse.json({ success: false, message: 'No saved progress found for this phone number' }, { status: 404 });
      }
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await ProgressOtp.deleteMany({ phone, purpose });
    await ProgressOtp.create({
      phone,
      purpose,
      codeHash: hashCode(phone, code),
      payload: purpose === 'save' ? {
        progress: body.progress || {},
        userName: String(body.userName || '').slice(0, 120),
        userId: String(body.userId || '').slice(0, 160),
      } : {},
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await sendSms({ to: phone, code, purpose });

    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('progress-otp POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to send verification code' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const purpose = body.purpose === 'restore' ? 'restore' : 'save';
    const phone = normalizePhone(body.phone);
    const code = String(body.code || '').trim();

    if (!phone || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ success: false, message: 'Invalid phone number or verification code' }, { status: 400 });
    }

    await dbConnect();

    const otp = await ProgressOtp.findOne({ phone, purpose });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: 'Verification code expired. Request a new code.' }, { status: 400 });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await ProgressOtp.deleteOne({ _id: otp._id });
      return NextResponse.json({ success: false, message: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (otp.codeHash !== hashCode(phone, code)) {
      otp.attempts += 1;
      await otp.save();
      return NextResponse.json({ success: false, message: 'Incorrect verification code' }, { status: 400 });
    }

    await ProgressOtp.deleteOne({ _id: otp._id });

    if (purpose === 'restore') {
      const backup = await ProgressBackup.findOne({ phone }).lean();
      if (!backup) {
        return NextResponse.json({ success: false, message: 'No saved progress found for this phone number' }, { status: 404 });
      }
      return NextResponse.json({ success: true, progress: backup.progress || {}, userName: backup.userName || '' });
    }

    const payload = otp.payload || {};
    await ProgressBackup.findOneAndUpdate(
      { phone },
      {
        $set: {
          progress: payload.progress || {},
          userName: payload.userName || '',
          userId: payload.userId || '',
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('progress-otp PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to verify code' }, { status: 500 });
  }
}
