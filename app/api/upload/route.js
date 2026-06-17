import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  // ✅ Avval auth tekshir
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Ruxsat yo'q" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get('filename');
    if (!filename) {
      return NextResponse.json(
        { error: "Fayl nomi ko'rsatilmagan" },
        { status: 400 }
      );
    }
    const blob = await put(filename, request.body, {
      access: 'private',
    });
    return NextResponse.json(blob);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Yuklashda xatolik yuz berdi: " + error.message },
      { status: 500 }
    );
  }
}