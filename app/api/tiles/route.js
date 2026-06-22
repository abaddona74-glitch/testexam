/**
 * Tile fallback API
 * Used when a tile doesn't exist locally in public/tiles/
 * Proxies from Esri World Street Map
 *
 * Primary tiles are served statically from /tiles/{z}/{x}/{y}.png
 * This API is only called as a fallback for tiles outside zoom 5-9
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const z = parseInt(searchParams.get('z'));
    const x = parseInt(searchParams.get('x'));
    const y = parseInt(searchParams.get('y'));

    if (isNaN(z) || isNaN(x) || isNaN(y) || z < 0 || x < 0 || y < 0) {
      return new NextResponse('Invalid tile coordinates', { status: 400 });
    }

    const url = ESRI_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 86400 }, // Cache for 24h
    });

    if (!response.ok) {
      return new NextResponse('Tile not found', { status: 404 });
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });

  } catch (error) {
    console.error('Tile proxy error:', error.message);
    return new NextResponse('Internal error', { status: 500 });
  }
}
