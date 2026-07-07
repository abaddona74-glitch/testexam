import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function POST(request) {
  // ✅ Avval admin auth tekshir (session + CSRF)
  const authError = requireAdminAuth(request);
  if (authError) return authError;

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