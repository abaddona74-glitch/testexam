import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('URL parameter is missing', { status: 400 });
  }

  // Premium tekshirish logikasini shu yerga qo'shishingiz mumkin:
  // misol uchun:
  // const session = await getServerSession();
  // if (!session?.user?.isPremium) return new Response('Forbidden', { status: 403 });

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    
    // Vercel Blob private url'ni o'qish uchun maxsus fetch (server to server)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return new Response('Rasmga kirish taqiqlangan yoki rasm topilmadi. (Private Access)', { status: response.status });
    }

    // Binary faylni foydalanuvchi sahifasiga proxy qilib (xavfsiz tarzda) jo'natamiz
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        // Kelajakda yengil ishlashi uchun keshlab olamiz
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error("Private image load error:", error);
    return new Response('Server error: ' + error.message, { status: 500 });
  }
}
