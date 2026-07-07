// app/api/debug-headers/route.js

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const allHeaders = {};
  
  // Barcha headerlarni yig'amiz
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Alohida muhim headerlarni ko'rsatamiz
  return NextResponse.json({
    // ===== CLOUDFLARE HEADERLARI =====
    'cf-connecting-ip': request.headers.get('cf-connecting-ip') || 'YO\'Q',
    'cf-ipcountry': request.headers.get('cf-ipcountry') || 'YO\'Q',
    'cf-ray': request.headers.get('cf-ray') || 'YO\'Q',
    
    // ===== VERCEL HEADERLARI =====
    'x-vercel-ip-country': request.headers.get('x-vercel-ip-country') || 'YO\'Q',
    'x-vercel-ip-city': request.headers.get('x-vercel-ip-city') || 'YO\'Q',
    
    // ===== UMUMIY =====
    'x-forwarded-for': request.headers.get('x-forwarded-for') || 'YO\'Q',
    'x-real-ip': request.headers.get('x-real-ip') || 'YO\'Q',
    
    // ===== BARCHA HEADERLAR =====
    'ALL_HEADERS': allHeaders
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}