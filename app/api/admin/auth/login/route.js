import { NextResponse } from 'next/server';
import {
  createAdminSessionForRequest,
  generateCsrfToken,
  getAdminPassword,
  setAdminAuthCookies,
  getClientIp,
} from '@/lib/admin-auth';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

if (!global._adminLoginRateLimit) {
  global._adminLoginRateLimit = new Map();
}

function isRateLimited(ip) {
  const store = global._adminLoginRateLimit;
  const now = Date.now();
  const entry = store.get(ip) || { attempts: [], blockedUntil: 0 };

  if (entry.blockedUntil > now) {
    return { limited: true, retryAfterMs: entry.blockedUntil - now };
  }

  entry.attempts = entry.attempts.filter(ts => now - ts < WINDOW_MS);
  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + WINDOW_MS;
    store.set(ip, entry);
    return { limited: true, retryAfterMs: WINDOW_MS };
  }

  store.set(ip, entry);
  return { limited: false, retryAfterMs: 0 };
}

function registerFailedAttempt(ip) {
  const store = global._adminLoginRateLimit;
  const now = Date.now();
  const entry = store.get(ip) || { attempts: [], blockedUntil: 0 };
  entry.attempts = entry.attempts.filter(ts => now - ts < WINDOW_MS);
  entry.attempts.push(now);

  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + WINDOW_MS;
  }

  store.set(ip, entry);
}

function clearAttempts(ip) {
  global._adminLoginRateLimit.delete(ip);
}

export async function POST(request) {
  const adminPassword = getAdminPassword();
  if (!adminPassword || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET and ADMIN_SESSION_SECRET must be configured' },
      { status: 500 }
    );
  }

  const reqInfo = extractRequestInfo(request);
  const ip = getClientIp(request);
  const limiter = isRateLimited(ip);
  if (limiter.limited) {
    await logActivity({
      type: 'login_attempt',
      ...reqInfo,
      statusCode: 429,
      isSuspicious: true,
      suspiciousReason: 'Admin login rate limit exceeded',
      details: {
        target: 'admin',
        result: 'blocked_rate_limit',
        retryAfterMs: limiter.retryAfterMs,
      },
    });

    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = String(body?.password || '');
  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  if (password !== adminPassword) {
    registerFailedAttempt(ip);

    await logActivity({
      type: 'login_attempt',
      ...reqInfo,
      statusCode: 401,
      isSuspicious: true,
      suspiciousReason: 'Invalid admin password',
      details: {
        target: 'admin',
        result: 'failed',
      },
    });

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  clearAttempts(ip);

  const session = createAdminSessionForRequest(request);
  if (!session?.token) {
    return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
  }

  const csrfToken = generateCsrfToken();
  const response = NextResponse.json({ success: true, csrfToken });
  setAdminAuthCookies(response, session.token, csrfToken);

  await logActivity({
    type: 'login_attempt',
    ...reqInfo,
    statusCode: 200,
    details: {
      target: 'admin',
      result: 'success',
    },
  });

  return response;
}
