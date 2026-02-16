import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Try Vercel's specific header (Fastest & Free)
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelCity = request.headers.get('x-vercel-ip-city');
    const vercelRegion = request.headers.get('x-vercel-ip-region');

    if (vercelCountry) {
      return NextResponse.json({ 
          country_code: vercelCountry,
          city: vercelCity,
          region: vercelRegion
      });
    }

    // 2. Fallback: Identify Client IP
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Handle comma-separated IPs (x-forwarded-for: client, proxy1, proxy2)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // If running solely on localhost, ip might be ::1 or 127.0.0.1 or ::ffff:127.0.0.1
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');

    // Use ipwho.is as primary - it's free, no key, and robust.
    // Documentation: https://ipwhois.io/documentation
    const apiUrl = isLocal 
      ? 'https://ipwho.is/' 
      : `https://ipwho.is/${ip}`;

    console.log(`Fetching country for IP: ${isLocal ? 'Localhost' : ip} from ${apiUrl}`);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.success) {
        console.error("IPWhois failed:", data.message);
        // Fallback to ipapi.co if ipwhois fails
        const fallbackUrl = isLocal ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            return NextResponse.json({ country_code: fallbackData.country_code || fallbackData.countryCode });
        }
        return NextResponse.json({ country_code: 'UZ' }); // Ultimate fallback
    }

    return NextResponse.json({ country_code: data.country_code });

  } catch (error) {
    console.error('Failed to fetch country:', error);
    return NextResponse.json({ country_code: null }, { status: 500 });
  }
}
