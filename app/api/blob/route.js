export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('URL parameter is missing', { status: 400 });
  }
  
  // Checking if the URL is valid
  if (!url.startsWith('http')) {
    return new Response('Noto\'g\'ri rasm formati', { status: 400 });
  }

  try {
    // Vercel Blob SDK orqali rasmni xavfsiz yuklab olish
    const blobResponse = await get(url, {
      access: 'private',
    });

    if (!blobResponse) {
      console.error(`Private image not found for URL: ${url}`);
      return new Response('Rasm topilmadi. (Private Access)', { status: 404 });
    }

    if (blobResponse.statusCode === 304) {
       return new Response(null, { status: 304 });
    }

    // Binary faylni foydalanuvchi sahifasiga proxy qilib (xavfsiz tarzda) jo'natamiz
    return new Response(blobResponse.stream, {
      headers: {
        'Content-Type': blobResponse.blob.contentType || 'image/jpeg',
        // Keshni yengillashtirish uchun faqat foydalanuvchida keshlanadi
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error) {
    console.error("Private image load error via SDK:", error);
    return new Response('Server error: ' + error.message, { status: 500 });
  }
}
