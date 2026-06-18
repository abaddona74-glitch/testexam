import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // DEBUG - barcha headerlarni ko'rish
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    'cf-connecting-ip': request.headers.get('cf-connecting-ip') || 'YOQ',
    'cf-ipcountry': request.headers.get('cf-ipcountry') || 'YOQ',
    'x-vercel-ip-country': request.headers.get('x-vercel-ip-country') || 'YOQ',
    'x-forwarded-for': request.headers.get('x-forwarded-for') || 'YOQ',
    'all': headers
  });
}