import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // 1. Try Vercel's specific header (Fastest & Free)
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    if (vercelCountry) {
      return NextResponse.json({ country_code: vercelCountry });
    }

    // 2. Fallback: Identify Client IP
    let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Handle comma-separated IPs (x-forwarded-for: client, proxy1, proxy2)
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // If running solely on localhost, ip might be ::1 or 127.0.0.1
    // ipapi.co returns info for the calling machine if no IP is provided.
    // So for localhost dev, the previous behavior was fine. 
    // But for production, we need the specific IP.

    const apiUrl = ip && ip !== '::1' && ip !== '127.0.0.1'
      ? `https://ipapi.co/${ip}/json/`
      : 'https://ipapi.co/json/';

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      // Handle Rate Limit (429) specifically
      // VPNs often hit this limit on free APIs. Fallback to 'UZ' so the app works smoothly.
      if (response.status === 429) {
        return NextResponse.json({ country_code: 'UZ' });
      }
      return NextResponse.json({ country_code: null }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch country:', error);
    return NextResponse.json({ country_code: null }, { status: 500 });
  }
}
