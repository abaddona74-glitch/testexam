import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Try Vercel's specific header (Fastest & Free) ⚡
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    const vercelRegion = request.headers.get('x-vercel-ip-region');

    // 🔥 BUG FIX: Faqat Vercel aniq "UZ" deb topsagina srazu javob beramiz.
    // Agar VPN-siz adashib "PL" bersa, bu shartdan o'tib, pastdagi aniq API-ga tushadi!
    if (vercelCountry && vercelCountry.toUpperCase() === 'UZ') {
      return NextResponse.json({ 
          country_code: 'UZ',
          country_code_lower: 'uz', // Frontendda bayroqlar uchun xavfsiz 🏴
          city: vercelCity ? decodeURIComponent(vercelCity) : 'Tashkent',
          region: vercelRegion ? decodeURIComponent(vercelRegion) : 'Tashkent'
      });
    }

    // 2. Fallback: Identify Client IP 🌐
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Handle comma-separated IPs (x-forwarded-for: client, proxy1, proxy2)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // If running solely on localhost
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');

    // Use ipwho.is as primary - it's free, no key, and robust.
    const apiUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

    console.log(`Fetching country for IP: ${isLocal ? 'Localhost' : ip} from ${apiUrl}`);

    const response = await fetch(apiUrl);
    const data = await response.json();

    // Agar ipwho.is muvaffaqiyatli ishlasa (Siz sinab ko'rgan toza JSON) 🟢
    if (data.success) {
      return NextResponse.json({ 
          country_code: data.country_code.toUpperCase(), // "UZ"
          country_code_lower: data.country_code.toLowerCase(), // "uz"
          city: data.city || 'Tashkent',
          region: data.region || 'Tashkent'
      });
    }

    // 3. Zaxira: Agar ipwho.is kutilmaganda muammoga duch kelsa 🔄
    console.error("IPWhois failed:", data.message);
    const fallbackUrl = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`;
    const fallbackRes = await fetch(fallbackUrl);
    
    if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const code = fallbackData.country_code || fallbackData.countryCode;
        if (code) {
          return NextResponse.json({ 
              country_code: code.toUpperCase(),
              country_code_lower: code.toLowerCase(),
              city: fallbackData.city || 'Tashkent',
              region: fallbackData.region || 'Tashkent'
          });
        }
    }
    
    // Ultimate fallback (Agarda barcha xizmatlar o'chib qolsa) 🇺🇿
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', city: 'Tashkent', region: 'Tashkent' });

  } catch (error) {
    console.error('Failed to fetch country:', error);
    // Crash bo'lmasligi uchun xatolik holatida ham default UZ qaytaramiz 🛡️
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', error: true }, { status: 500 });
  }
}