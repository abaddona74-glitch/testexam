import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: "Fayl nomi ko'rsatilmagan" },
        { status: 400 }
      );
    }

    // request.body dagi fayl ma'lumotlarini qabul qilib Vercel Blob'ga yuklaymiz
    const blob = await put(filename, request.body, {
      access: 'private',
    });

    // Yuklangan manzil(url) va ma'lumotlarni qaytaramiz
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Yuklashda xatolik yuz berdi: " + error.message },
      { status: 500 }
    );
  }
}
