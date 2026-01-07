import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
        // Fallback or error
        return NextResponse.json({ country_code: null }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch country:', error);
    return NextResponse.json({ country_code: null }, { status: 500 });
  }
}
