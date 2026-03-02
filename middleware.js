import { NextResponse } from 'next/server'

// In-memory blocked IP/device cache (loaded from DB via admin API)
if (!globalThis._blockedCache) {
  globalThis._blockedCache = { ips: new Set(), deviceIds: new Set(), loaded: false };
}

export function middleware(request) {
  const { nextUrl: url, geo } = request
  
  // Extract IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  const country = geo?.country || request.headers.get('x-vercel-ip-country') || 'Unknown'
  const city = geo?.city || request.headers.get('x-vercel-ip-city') || 'Unknown'
  const region = geo?.region || request.headers.get('x-vercel-ip-region') || 'Unknown'

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
  
  return response;
}

// Middleware applies to all routes (including API) for IP blocking
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|logo\\.png|og-image\\.jpg).*)',
  ],
}
