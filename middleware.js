import { NextResponse } from 'next/server'

// In-memory blocked IP/device cache (loaded from DB via admin API)
if (!globalThis._blockedCache) {
  globalThis._blockedCache = { ips: new Set(), deviceIds: new Set(), loaded: false };
}

export function middleware(request) {
  const { nextUrl: url, geo } = request
  const isAdminApi = url.pathname.startsWith('/api/admin/');
  const isAdminAuthLogin = url.pathname === '/api/admin/auth/login';
  const isAdminAuthSessionGet = url.pathname === '/api/admin/auth/session' && request.method === 'GET';
  
  // Extract IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  const country = geo?.country || request.headers.get('x-vercel-ip-country') || 'Unknown'
  const city = geo?.city || request.headers.get('x-vercel-ip-city') || 'Unknown'
  const region = geo?.region || request.headers.get('x-vercel-ip-region') || 'Unknown'

  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://va.vercel-scripts.com"
    : "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://va.vercel-scripts.com";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://va.vercel-scripts.com https://vitals.vercel-insights.com https://ipapi.co",
    "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
    "upgrade-insecure-requests",
  ].join('; ');

  // ─── Admin API pre-check (cookie/session + CSRF) ─────────
  if (isAdminApi && !isAdminAuthLogin && !isAdminAuthSessionGet) {
    const sessionCookie = request.cookies.get('admin_session')?.value;
    if (!sessionCookie) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const method = request.method.toUpperCase();
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    if (isUnsafeMethod) {
      const csrfCookie = request.cookies.get('admin_csrf')?.value;
      const csrfHeader = request.headers.get('x-csrf-token');
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
  }

  // ─── IP Blocking Check ──────────────────────────────
  const blockedCache = globalThis._blockedCache;
  if (blockedCache.loaded && blockedCache.ips.has(ip)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access Denied', 
        message: 'Sizning IP manzilingiz bloklangan. Admin bilan bog\'laning.' 
      }),
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // ─── Security: Basic injection detection in URL ─────
  const urlStr = url.pathname + url.search;
  const suspiciousPatterns = [
    /<script/i, /javascript:/i, /UNION\s+SELECT/i,
    /etc\/passwd/i, /\.\.\/\.\.\//i, /exec\s*\(/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(urlStr)) {
      console.warn(`⚠️ Suspicious request from ${ip}: ${urlStr}`);
      // Don't block yet, just log (actual blocking happens in API routes)
      // But block obvious attacks
      return new NextResponse(
        JSON.stringify({ error: 'Suspicious request blocked' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Log to console (visible in Vercel logs)
  if (!url.pathname.startsWith('/api/')) {
    console.log(`[${ip}] ${country}/${city} → ${url.pathname}`)
  }

  // Add IP and geo info to headers for downstream API routes
  const response = NextResponse.next();
  response.headers.set('x-client-ip', ip);
  response.headers.set('x-geo-country', country);
  response.headers.set('x-geo-city', city);
  response.headers.set('x-geo-region', region);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  
  return response;
}

// Middleware applies to all routes (including API) for IP blocking
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|logo\\.png|og-image\\.jpg).*)',
  ],
}
