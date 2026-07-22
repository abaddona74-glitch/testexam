import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import ProgressBackup from '@/models/ProgressBackup';
import ProgressOtp from '@/models/ProgressOtp';
import User from '@/models/User';

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

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';
  return cleaned;
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

async function sendEmail({ to, code, purpose }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const action = purpose === 'restore' ? 'Restore' : 'Save';
  await transporter.sendMail({
    from: `"ExamTest" <${from}>`,
    to,
    subject: `ExamTest ${action} Verification Code`,
    text: `Your ${action.toLowerCase()} verification code is: ${code}\n\nIt expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px">
      <h2 style="color:#059669">ExamTest ${action}</h2>
      <p style="font-size:16px;color:#333">Your verification code:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#059669;text-align:center;padding:16px;background:#f0fdf4;border-radius:8px">${code}</div>
      <p style="color:#666;font-size:13px;margin-top:16px">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
    </div>`,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const purpose = body.purpose === 'restore' ? 'restore' : 'save';
    const contactType = body.contactType === 'email' ? 'email' : 'phone';
    const phone = contactType === 'phone' ? normalizePhone(body.phone) : '';
    const email = contactType === 'email' ? normalizeEmail(body.email) : '';

    if (contactType === 'phone' && !phone) {
      return NextResponse.json({ success: false, message: 'Phone number must be in international format, e.g. +998901234567' }, { status: 400 });
    }
    if (contactType === 'email' && !email) {
      return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 });
    }

    if (purpose === 'save' && getProgressSize(body.progress) > MAX_PROGRESS_BYTES) {
      return NextResponse.json({ success: false, message: 'Progress data is too large to save' }, { status: 413 });
    }

    await dbConnect();

    if (purpose === 'save' && contactType === 'email') {
      const myName = String(body.userName || '');
      const existing = await ProgressBackup.findOne({ email, userName: { $ne: myName } }).lean();
      console.log('[progress-otp] email check:', { email, myUser: myName, found: !!existing, foundUserName: existing?.userName });
      if (existing) {
        return NextResponse.json({ success: false, alreadyLinked: true, message: 'This email is already linked to another account' }, { status: 409 });
      }
    }
    if (purpose === 'save' && contactType === 'phone') {
      const myName = String(body.userName || '');
      const existing = await ProgressBackup.findOne({ phone, userName: { $ne: myName } }).lean();
      console.log('[progress-otp] phone check:', { phone, myUser: myName, found: !!existing, foundUserName: existing?.userName });
      if (existing) {
        return NextResponse.json({ success: false, alreadyLinked: true, message: 'This phone number is already linked to another account' }, { status: 409 });
      }
    }

    const query = contactType === 'email' ? { email } : { phone };
    if (purpose === 'restore') {
      const backup = await ProgressBackup.findOne(query).lean();
      if (!backup) {
        const label = contactType === 'email' ? 'email address' : 'phone number';
        return NextResponse.json({ success: false, message: `No saved progress found for this ${label}` }, { status: 404 });
      }
    }

    const contact = contactType === 'email' ? email : phone;
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

    if (contactType === 'email') {
      await ProgressOtp.deleteMany({ email, purpose });
    } else {
      await ProgressOtp.deleteMany({ phone, purpose });
    }

    const otpData = {
      contactType,
      codeHash: hashCode(contact, code),
      purpose,
      payload: purpose === 'save' ? {
        progress: body.progress || {},
        userName: String(body.userName || '').slice(0, 120),
        userId: String(body.userId || '').slice(0, 160),
      } : {},
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    };
    if (contactType === 'email') {
      otpData.email = email;
    } else {
      otpData.phone = phone;
    }
    await ProgressOtp.create(otpData);

    if (contactType === 'email') {
      await sendEmail({ to: email, code, purpose });
    } else {
      await sendSms({ to: phone, code, purpose });
    }

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
    const contactType = body.contactType === 'email' ? 'email' : 'phone';
    const phone = contactType === 'phone' ? normalizePhone(body.phone) : '';
    const email = contactType === 'email' ? normalizeEmail(body.email) : '';
    const code = String(body.code || '').trim();

    if (contactType === 'phone') {
      if (!phone || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ success: false, message: 'Invalid phone number or verification code' }, { status: 400 });
      }
    } else {
      if (!email || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ success: false, message: 'Invalid email or verification code' }, { status: 400 });
      }
    }

    await dbConnect();

    const contact = contactType === 'email' ? email : phone;
    const query = contactType === 'email' ? { email, purpose } : { phone, purpose };
    const otp = await ProgressOtp.findOne(query);
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: 'Verification code expired. Request a new code.' }, { status: 400 });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await ProgressOtp.deleteOne({ _id: otp._id });
      return NextResponse.json({ success: false, message: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (otp.codeHash !== hashCode(contact, code)) {
      otp.attempts += 1;
      await otp.save();
      return NextResponse.json({ success: false, message: 'Incorrect verification code' }, { status: 400 });
    }

    await ProgressOtp.deleteOne({ _id: otp._id });

    if (purpose === 'restore') {
      const q = contactType === 'email' ? { email } : { phone };
      const backup = await ProgressBackup.findOne(q).lean();
      if (!backup) {
        return NextResponse.json({ success: false, message: 'No saved progress found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, progress: backup.progress || {}, userName: backup.userName || '' });
    }

    const payload = otp.payload || {};
    const q = contactType === 'email' ? { email } : { phone };
    const update = {
      $set: {
        progress: payload.progress || {},
        userName: payload.userName || '',
        userId: payload.userId || '',
        contactType,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
    };
    if (contactType === 'email') {
      update.$set.email = email;
      update.$unset = { phone: '' };
    } else {
      update.$set.phone = phone;
      update.$unset = { email: '' };
    }
    const saved = await ProgressBackup.findOneAndUpdate(q, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log('[progress-otp] saved progress:', { contactType, email: saved?.email, phone: saved?.phone, userName: saved?.userName });

    if (contactType === 'email' && payload.userName) {
      await User.findOneAndUpdate(
        { userName: payload.userName },
        { $set: { email } },
        { upsert: false }
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('progress-otp PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to verify code' }, { status: 500 });
  }
}