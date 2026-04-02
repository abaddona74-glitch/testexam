import { NextResponse } from 'next/server';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_CSRF_COOKIE = 'admin_csrf';
export const ADMIN_SESSION_TTL_SECONDS = 15 * 60;

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSecureCookieContext() {
  return process.env.NODE_ENV === 'production';
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getSessionSigningKey() {
  const raw = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET;
  if (!raw || typeof raw !== 'string' || raw.trim().length < 16) return null;
  return raw.trim();
}

export function getAdminPassword() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || typeof secret !== 'string') return null;
  const trimmed = secret.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('x-client-ip')
    || '127.0.0.1';
}

function createSignature(payloadBase64, key) {
  return createHmac('sha256', key).update(payloadBase64).digest('base64url');
}

function timingSafeStringEqual(a, b) {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function hashUserAgent(ua) {
  return createHmac('sha256', 'admin-ua-bind').update(String(ua || 'unknown')).digest('base64url');
}

export function signAdminSession(payload) {
  const key = getSessionSigningKey();
  if (!key) return null;
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const sig = createSignature(payloadBase64, key);
  return `${payloadBase64}.${sig}`;
}

function verifySessionToken(token) {
  const key = getSessionSigningKey();
  if (!key || !token || typeof token !== 'string') return null;
  const [payloadBase64, sig] = token.split('.');
  if (!payloadBase64 || !sig) return null;

  const expectedSig = createSignature(payloadBase64, key);
  if (!timingSafeStringEqual(sig, expectedSig)) return null;

  try {
    return JSON.parse(base64UrlDecode(payloadBase64));
  } catch {
    return null;
  }
}

export function createAdminSessionForRequest(request) {
  const ip = getClientIp(request);
  const uaHash = hashUserAgent(request.headers.get('user-agent'));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iat: nowSec,
    exp: nowSec + ADMIN_SESSION_TTL_SECONDS,
    ip,
    ua: uaHash,
    nonce: randomBytes(12).toString('base64url'),
  };
  return {
    token: signAdminSession(payload),
    payload,
  };
}

export function generateCsrfToken() {
  return randomBytes(24).toString('base64url');
}

export function setAdminAuthCookies(response, sessionToken, csrfToken) {
  const secure = isSecureCookieContext();
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  response.cookies.set(ADMIN_CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export function clearAdminAuthCookies(response) {
  const secure = isSecureCookieContext();
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(ADMIN_CSRF_COOKIE, '', {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function validateCsrf(request) {
  const method = (request.method || 'GET').toUpperCase();
  if (READ_METHODS.has(method)) return true;

  const csrfCookie = request.cookies?.get(ADMIN_CSRF_COOKIE)?.value;
  const csrfHeader = request.headers.get('x-csrf-token');
  return timingSafeStringEqual(csrfCookie, csrfHeader);
}

function validateAdminSessionFromRequest(request) {
  const token = request.cookies?.get(ADMIN_SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return { ok: false, reason: 'invalid_session' };

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || nowSec >= payload.exp) {
    return { ok: false, reason: 'session_expired' };
  }

  const ip = getClientIp(request);
  if (!payload.ip || payload.ip !== ip) {
    return { ok: false, reason: 'ip_mismatch' };
  }

  const uaHash = hashUserAgent(request.headers.get('user-agent'));
  if (!payload.ua || payload.ua !== uaHash) {
    return { ok: false, reason: 'ua_mismatch' };
  }

  return { ok: true, payload };
}

export function isAdminAuthorizedRequest(request) {
  return validateAdminSessionFromRequest(request).ok;
}

export function requireAdminAuth(request) {
  if (!getAdminPassword() || !getSessionSigningKey()) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET and ADMIN_SESSION_SECRET must be configured on the server' },
      { status: 500 }
    );
  }

  const sessionCheck = validateAdminSessionFromRequest(request);
  if (!sessionCheck.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: sessionCheck.reason }, { status: 401 });
  }

  if (!validateCsrf(request)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return null;
}
