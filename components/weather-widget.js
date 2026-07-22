'use client';
import { useState, useEffect } from 'react';

export function WeatherWidget({ className = '' }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        if (cancelled) return;
        if (data.success) setWeather(data.data);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    };

    const getLocation = async () => {
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false });
          });
          if (!cancelled) fetchWeather(pos.coords.latitude, pos.coords.longitude);
          return;
        } catch {}
      }
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (!cancelled && ipData.latitude && ipData.longitude) {
            fetchWeather(ipData.latitude, ipData.longitude);
            return;
          }
        }
      } catch {}
      if (!cancelled) setLoading(false);
    };

    getLocation();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <span className="text-sm text-gray-400">🌤️ ..°</span>;
  if (!weather) return null;

  return (
    <span className={`text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 cursor-default ${className}`} title={weather.desc}>
      <span>{weather.icon}</span>
      <span>{weather.temp}°</span>
    </span>
  );
}