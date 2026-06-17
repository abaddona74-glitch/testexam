import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Foydalanuvchining haqiqiy IP manzilini aniqlaymiz 🌐
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Cloudflare/Vercel proksi IP-larini tozalaymiz
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Localhost tekshiruvi
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');

    // 🔥 Har doim jonli IPWhois API'ga murojaat qilamiz (Vercel shartini olib tashladik)
    const apiUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

    console.log(`Fetching 100% live country for IP: ${isLocal ? 'Localhost' : ip}`);

    // Next.js keshini batamom o'chiramiz 🚫
    const response = await fetch(apiUrl, {
        cache: 'no-store',
        next: { revalidate: 0 }
    });
    const data = await response.json();

    // Agar ipwho.is muvaffaqiyatli ishlasa 🟢
    if (data.success) {
      return NextResponse.json({ 
          country_code: data.country_code.toUpperCase(), // "UZ", "LV", "PL"
          country_code_lower: data.country_code.toLowerCase(), // frontend bayroqlari uchun
          city: data.city || 'Tashkent',
          region: data.region || 'Tashkent'
      });
    }

    // 2. Zaxira variant (Fallback): Agar ipwho.is limiti tugasa yoki ishlamasa 🔄
    console.error("IPWhois failed:", data.message);
    const fallbackUrl = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`;
    
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
    
    // Eng so'nggi ilojsiz chora 🇺🇿
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', city: 'Tashkent', region: 'Tashkent' });

  } catch (error) {
    console.error('Failed to fetch real-time country:', error);
    return NextResponse.json({ country_code: 'UZ', country_code_lower: 'uz', error: true }, { status: 500 });
  }
}