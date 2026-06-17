import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Vercel tizim headerlarini tekshiramiz ⚡
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    const vercelRegion = request.headers.get('x-vercel-ip-region');

    // 🔥 Agarda Vercel aniq "UZ" deb topsagina srazu javob beramiz.
    // Agar VPN-siz adashib "PL" yoki boshqa davlat bersa, bu shartni aylanib o'tib pastga tushadi.
    if (vercelCountry && vercelCountry.toUpperCase() === 'UZ') {
      return NextResponse.json({ 
          country_code: 'UZ',
          country_code_lower: 'uz', // Frontend bayroqlari uchun 🏴
          city: vercelCity ? decodeURIComponent(vercelCity) : 'Tashkent',
          region: vercelRegion ? decodeURIComponent(vercelRegion) : 'Tashkent'
      });
    }

    // 2. Foydalanuvchining haqiqiy IP manzilini aniqlaymiz 🌐
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Comma-separated IP-larni tozalaymiz (Cloudflare/Vercel proksi)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Localhost yoki yo'qligini tekshirish
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');

    // IPWhois API manzili
    const apiUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

    console.log(`Fetching live country for IP: ${isLocal ? 'Localhost' : ip}`);

    // 🔥 BUG FIX: Next.js agresiv keshini 'no-store' orqali butunlay o'chiramiz! 🚫
    const response = await fetch(apiUrl, {
        cache: 'no-store',
        next: { revalidate: 0 }
    });
    const data = await response.json();

    // Agar ipwho.is muvaffaqiyatli ishlasa (Jonli va aniq natija) 🟢
    if (data.success) {
      return NextResponse.json({ 
          country_code: data.country_code.toUpperCase(), // "UZ", "PL", "LV"
          country_code_lower: data.country_code.toLowerCase(), // "uz", "pl", "lv"
          city: data.city || 'Tashkent',
          region: data.region || 'Tashkent'
      });
    }

    // 3. Zaxira variant: Agar ipwho.is kutilmaganda bloklansa yoki ishlamasa 🔄
    console.error("IPWhois failed:", data.message);
    const fallbackUrl = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`;
    
    // Zaxira so'rovida ham keshni o'chiramiz 🚫
    const fallbackRes = await fetch(fallbackUrl, {
        cache: 'no-store',
        next: { revalidate: 0 }
    });
    
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
    
    // Eng so'nggi ilojsiz chora (Ultimate Fallback) 🇺🇿
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', city: 'Tashkent', region: 'Tashkent' });

  } catch (error) {
    console.error('Failed to fetch country:', error);
    // Tizim butunlay crash bo'lmasligi uchun default xavfsiz qiymat qaytaramiz 🛡️
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', error: true }, { status: 500 });
  }
}