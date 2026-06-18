import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. FAKAT Cloudflare headerlaridan real client ma'lumotini olamiz
    // CF-Connecting-IP = real client IP
    // CF-IPCountry = real client country (2-letter code)
    const clientIp = request.headers.get('cf-connecting-ip');
    const countryCode = request.headers.get('cf-ipcountry');
    const city = request.headers.get('cf-ipcity');
    const region = request.headers.get('cf-region');
    
    // 2. Agar Cloudflare headerlari bo'lsa, ularni ishlatamiz
    if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json({
        country_code: countryCode,
        city: city || null,
        region: region || null,
        ip: clientIp || 'unknown',
        source: 'cloudflare-headers'
      });
    }
    
    // 3. Agar Cloudflare headerlari yo'q bo'lsa (Cloudflare proxy OFF), 
    //    Vercel headerlarini tekshiramiz
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    if (vercelCountry) {
      return NextResponse.json({
        country_code: vercelCountry,
        city: request.headers.get('x-vercel-ip-city') || null,
        region: request.headers.get('x-vercel-ip-region') || null,
        source: 'vercel-headers'
      });
    }
    
    // 4. Agar hech narsa bo'lmasa, fallback
    return NextResponse.json({
      country_code: 'UZ',
      city: 'Tashkent',
      region: 'Tashkent',
      source: 'fallback'
    });

  } catch (error) {
    console.error('Geo API error:', error);
    return NextResponse.json(
      { error: 'Failed to detect location' }, 
      { status: 500 }
    );
  }
}