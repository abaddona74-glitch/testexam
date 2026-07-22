import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WeatherCache from '@/models/WeatherCache';

const CACHE_TTL_MS = 60 * 60 * 1000;
const OWM_KEY = process.env.NEXT_PUBLIC_OWM_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json({ success: false, message: 'lat and lon required' }, { status: 400 });
    }

    const cacheKey = `${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;

    await dbConnect();

    const cached = await WeatherCache.findOne({ cacheKey }).lean();
    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data, cached: true });
    }

    if (!OWM_KEY) {
      return NextResponse.json({ success: false, message: 'API key not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`
    );
    if (!res.ok) throw new Error('OpenWeatherMap API failed');
    const raw = await res.json();

    const data = {
      temp: Math.round(raw.main.temp),
      icon: getIcon(raw.weather[0].id),
      desc: `${getDesc(raw.weather[0].id)}, ${raw.name}`,
    };

    await WeatherCache.findOneAndUpdate(
      { cacheKey },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data, cached: false });
  } catch (error) {
    console.error('[weather] error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

function getIcon(id) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return '☀️';
  if (id === 801) return '🌤️';
  if (id === 802) return '⛅';
  if (id >= 803) return '☁️';
  return '🌡️';
}

function getDesc(id) {
  const map = {
    200: 'Thunderstorm', 300: 'Drizzle', 500: 'Rain', 600: 'Snow',
    700: 'Fog', 800: 'Clear', 801: 'Few clouds', 802: 'Scattered clouds',
    803: 'Broken clouds', 804: 'Overcast',
  };
  const key = id >= 800 ? (id <= 804 ? id : 804) : Math.floor(id / 100) * 100;
  return map[key] || 'Unknown';
}