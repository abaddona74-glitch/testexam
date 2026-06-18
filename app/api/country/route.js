import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
      // 1. Vercel'dan keladigan IP headerlar (bular Vercel serverlarida 100% ishlaydi)
      const country = request.headers.get('x-vercel-ip-country');
      const city = request.headers.get('x-vercel-ip-city');
      const region = request.headers.get('x-vercel-ip-region');
  
      if (country) {
        return NextResponse.json({ 
            country_code: country, 
            city: city, 
            region: region 
        });
      }
  
      // 2. Agar Vercel bermasa, Cloudflare'ni tekshiramiz
      const cfCountry = request.headers.get('cf-ipcountry');
      if (cfCountry) {
          return NextResponse.json({ country_code: cfCountry });
      }
  
      // 3. Fallback (agar hech narsa topilmasa)
      return NextResponse.json({ country_code: 'UZ', city: 'Tashkent' });
  
    } catch (error) {
      return NextResponse.json({ country_code: 'UZ' });
    }
  }