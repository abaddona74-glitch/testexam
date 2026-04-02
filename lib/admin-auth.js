import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

function getConfiguredAdminSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || typeof secret !== 'string') return null;
  const trimmed = secret.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getProvidedSecret(request) {
  const headerSecret = request.headers.get('x-admin-secret');
  if (headerSecret) return headerSecret;

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

function secretsMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAdminAuthorizedRequest(request) {
  const expected = getConfiguredAdminSecret();
  const provided = getProvidedSecret(request);
  if (!expected || !provided) return false;
  return secretsMatch(provided, expected);
}

export function requireAdminAuth(request) {
  const expected = getConfiguredAdminSecret();
  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET is not configured on the server' },
      { status: 500 }
    );
  }

  const provided = getProvidedSecret(request);
  if (!provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
