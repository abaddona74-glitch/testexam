import { NextResponse } from 'next/server';
import { isAdminAuthorizedRequest, generateCsrfToken, setAdminAuthCookies, requireAdminAuth } from '@/lib/admin-auth';

export async function GET(request) {
  const authed = isAdminAuthorizedRequest(request);
  if (!authed) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  // Keep CSRF fresh during active admin session.
  const csrfToken = generateCsrfToken();
  const response = NextResponse.json({ authenticated: true, csrfToken });

  const sessionToken = request.cookies.get('admin_session')?.value;
  if (sessionToken) {
    setAdminAuthCookies(response, sessionToken, csrfToken);
  }

  return response;
}

export async function POST(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const csrfToken = generateCsrfToken();
  const response = NextResponse.json({ success: true, csrfToken });
  const sessionToken = request.cookies.get('admin_session')?.value;
  if (sessionToken) {
    setAdminAuthCookies(response, sessionToken, csrfToken);
  }
  return response;
}
