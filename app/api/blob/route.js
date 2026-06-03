export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('URL parameter is missing', { status: 400 });
  }
  
  // Checking if the URL is valid
  if (!url.startsWith('http')) {
    // Agar bu nisbiy URL (masalan: static rasm) bo'lsa
    // Uni o'zimizning serverdan olib kelishimiz kerak bo'lishi mumkin yoki shunchaki xato qaytaramiz
    // Vercel Blob bo'lmagani uchun to'g'ridan-to'g'ri qaytarish yaxshiroq
    return new Response('Noto\'g\'ri rasm formati', { status: 400 });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    // Vercel Blob private url'ni o'qish uchun maxsus fetch (server to server)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Private image load error: status ${response.status} for URL: ${url}`);
      return new Response(`Rasmga kirish taqiqlangan yoki rasm topilmadi. (Private Access - Status: ${response.status})`, { status: response.status });
    }

    // Binary faylni foydalanuvchi sahifasiga proxy qilib (xavfsiz tarzda) jo'natamiz
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        // Kelajakda yengil ishlashi uchun keshlab olamiz (faqat mijoza, serverda emas)
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error) {
    console.error("Private image load error:", error);
    return new Response('Server error: ' + error.message, { status: 500 });
  }
}
