import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Cloudflare proxy orqali kelganda BU header 100% keladi
    const countryCode = request.headers.get('cf-ipcountry');
    const clientIp = request.headers.get('cf-connecting-ip');

    if (countryCode && countryCode !== 'XX' && /^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json({
        country_code: countryCode,
        city: request.headers.get('cf-ipcity') || null,
        region: request.headers.get('cf-region') || null,
        ip: clientIp,
        source: 'cloudflare'
      });
    }

    // Agar CF header kelmasa (proxy yoqilmagan bo'lsa)
    // IP ni olib, tashqi API dan so'raymiz
    const ip = clientIp 
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip');

    if (ip && ip !== '::1' && !ip.includes('127.0.0.1')) {
      try {
        const res = await fetch(`https://ipwho.is/${ip}`);
        const data = await res.json();
        if (data.success) {
          return NextResponse.json({
            country_code: data.country_code,
            city: data.city,
            region: data.region,
            ip: ip,
            source: 'ipwhois'
          });
        }
      } catch (e) {
        console.error('ipwhois failed:', e);
      }
    }

    // Fallback
    return NextResponse.json({
      country_code: 'UZ',
      city: 'Tashkent',
      source: 'fallback'
    });

  } catch (error) {
    return NextResponse.json({ country_code: 'UZ', source: 'error' });
  }
}