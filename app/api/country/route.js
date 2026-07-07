import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cfCountry = request.headers.get('cf-ipcountry');

    if (cfCountry && cfCountry !== 'XX' && /^[A-Z]{2}$/.test(cfCountry)) {
      return NextResponse.json({
        country_code: cfCountry,
        city: null,
        region: null
      });
    }

    const vercelCountry = request.headers.get('x-vercel-ip-country');
    if (vercelCountry) {
      return NextResponse.json({
        country_code: vercelCountry,
        city: request.headers.get('x-vercel-ip-city'),
        region: request.headers.get('x-vercel-ip-region')
      });
    }

    return NextResponse.json({
      country_code: 'UZ',
      city: 'Tashkent',
      region: null
    });

  } catch (error) {
    return NextResponse.json({ country_code: 'UZ' });
  }
}