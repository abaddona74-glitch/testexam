import { NextResponse } from 'next/server'

if (!globalThis._blockedCache) {
  globalThis._blockedCache = { ips: new Set(), deviceIds: new Set(), loaded: false };
}

export function proxy(request) {
  const hostname = request.headers.get('host')
  const { nextUrl: url, geo } = request

  // ─── admin.test-exam.uz subdomenini /admin ga yo'naltirish ───
  if (hostname === 'admin.test-exam.uz') {
    // API marshrutlarini o'zgartirmaymiz – ular original /api/admin/... da qoladi
    // va middleware tekshiruvlaridan (session, block, CSP) o'tadi
    if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/tiles/')) {
      const rewriteUrl = url.clone()
      rewriteUrl.pathname = `/admin${rewriteUrl.pathname}`
      const response = NextResponse.rewrite(rewriteUrl)
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
      return response
    }
  }

  const isAdminApi = url.pathname.startsWith('/api/admin/');
  const isAdminAuthLogin = url.pathname === '/api/admin/auth/login';
  const isAdminAuthSessionGet = url.pathname === '/api/admin/auth/session' && request.method === 'GET';
  
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  const country = geo?.country || request.headers.get('x-vercel-ip-country') || 'Unknown'
  const city = geo?.city || request.headers.get('x-vercel-ip-city') || 'Unknown'
  const region = geo?.region || request.headers.get('x-vercel-ip-region') || 'Unknown'

  const scriptSrc = `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru https://yastatic.net https://va.vercel-scripts.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com`;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: https://server.arcgisonline.com",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru https://yastatic.net https://yandex.ru https://va.vercel-scripts.com https://vitals.vercel-insights.com https://ipapi.co https://cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://storage.googleapis.com https://tfhub.dev https://www.kaggle.com https://mediapipe.dev https://cdn.jsdelivr.net npm",
    "frame-src https://smartcaptcha.yandexcloud.net https://smartcaptcha.cloud.yandex.ru",
    "upgrade-insecure-requests",
  ].join('; ');

  if (isAdminApi && !isAdminAuthLogin && !isAdminAuthSessionGet) {
    const sessionCookie = request.cookies.get('admin_session')?.value;
    if (!sessionCookie) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  const blockedCache = globalThis._blockedCache;
  if (blockedCache.loaded && blockedCache.ips.has(ip)) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access Denied', 
        message: 'Sizning IP manzilingiz bloklangan. Admin bilan bog\'laning.' 
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const urlStr = url.pathname + url.search;
  const suspiciousPatterns = [
    /<script/i, /javascript:/i, /UNION\s+SELECT/i,
    /etc\/passwd/i, /\.\.\/\.\.\//i, /exec\s*\(/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(urlStr)) {
      console.warn(`⚠️ Suspicious request from ${ip}: ${urlStr}`);
      return new NextResponse(
        JSON.stringify({ error: 'Suspicious request blocked' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (!url.pathname.startsWith('/api/')) {
    console.log(`[${ip}] ${country}/${city} → ${url.pathname}`)
  }

  const response = NextResponse.next();
  response.headers.set('x-client-ip', ip);
  response.headers.set('x-geo-country', country);
  response.headers.set('x-geo-city', city);
  response.headers.set('x-geo-region', region);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|logo\\.png|og-image\\.jpg).*)',
  ],
}