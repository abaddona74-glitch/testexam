import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // ✅ Cloudflare'dan to'g'ri keladi (UZ)
    const countryCode = request.headers.get('cf-ipcountry');
    const clientIp = request.headers.get('cf-connecting-ip');

    if (countryCode && countryCode !== 'XX' && /^[A-Z]{2}$/.test(countryCode)) {
      
      // Shahar kerak bo'lsa, real IP orqali olamiz
      let city = null;
      let region = null;
      
      if (clientIp) {
        try {
          const res = await fetch(`https://ipwho.is/${clientIp}`);
          const data = await res.json();
          if (data.success) {
            city = data.city;
            region = data.region;
          }
        } catch (e) {
          console.error('City fetch failed:', e);
        }
      }

      return NextResponse.json({
        country_code: countryCode,  // ✅ UZ
        city: city,
        region: region,
        ip: clientIp
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    // Fallback
    return NextResponse.json({
      country_code: 'UZ',
      city: 'Tashkent'
    });

  } catch (error) {
    return NextResponse.json({ country_code: 'UZ' });
  }
}