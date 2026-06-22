import { NextResponse } from 'next/server';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { isBlocked } from '../admin/block/route';

if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

// 🌐 IP dan to'liq lokatsiya ma'lumotlarini olish (country, lat, lng, city)
async function getLocationFromIP(ip) {
  try {
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');
    if (isLocal) return { country: 'UZ', lat: null, lng: null, city: null };

    const response = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();

    if (data.success) {
      return {
        country: (data.country_code || 'UZ').toUpperCase(),
        lat: data.latitude || null,
        lng: data.longitude || null,
        city: data.city || null,
      };
    }
    return { country: 'UZ', lat: null, lng: null, city: null };
  } catch (e) {
    return { country: 'UZ', lat: null, lng: null, city: null };
  }
}

// 📥 GET
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    const now = Date.now();
    const BROWSING_TTL_MS = 30 * 1000;
    const AFK_TTL_MS = 2 * 60 * 1000;
    const IN_TEST_TTL_MS = 3 * 60 * 1000;

    Object.keys(activeSessions).forEach(key => {
      const session = activeSessions[key];
      const ttl = session?.status === 'afk'
        ? AFK_TTL_MS
        : (session?.status === 'in-test' || session?.testId) ? IN_TEST_TTL_MS : BROWSING_TTL_MS;
      if (!session?.lastUpdated || (now - session.lastUpdated > ttl)) {
        delete activeSessions[key];
      }
    });

    let sessions = Object.values(activeSessions);

    if (testId) {
      sessions = sessions.filter(s => s.testId === testId);
    }

    const uniqueUsers = {};
    sessions.forEach(session => {
      const existing = uniqueUsers[session.userId];
      if (!existing) {
        uniqueUsers[session.userId] = session;
      } else {
        const score = (s) => {
          if (s.status === 'in-test') return 4;
          if (s.status === 'browsing') return 3;
          if (s.status === 'registering') return 2;
          return 1;
        };
        if (score(session) > score(existing)) {
          uniqueUsers[session.userId] = session;
        } else if (score(session) === score(existing)) {
          if (session.lastUpdated > existing.lastUpdated) {
            uniqueUsers[session.userId] = session;
          }
        }
      }
    });

    const finalUsers = Object.values(uniqueUsers);

    // ✅ FIX: Country ni ONLAYN tekshiramiz
    const updatedUsers = await Promise.all(
      finalUsers.map(async (user) => {
        let result = {
          country: user.country || 'UZ',
          lat: user.lat || null,
          lng: user.lng || null,
          city: user.city || null,
          locationSource: user.locationSource || 'ip',
        };

        // Agar country yo'q yoki noto'g'ri bo'lsa, API dan so'raymiz
        if (!result.country || result.country === 'XX' || result.country.length !== 2) {
          const location = await getLocationFromIP(user.ip);
          result.country = location.country;
          if (!result.lat) result.lat = location.lat;
          if (!result.lng) result.lng = location.lng;
          if (!result.city) result.city = location.city;
          if (!user.locationSource) result.locationSource = 'ipwhois';
        }

        return {
          ...user,
          ...result,
        };
      })
    );

    return NextResponse.json(updatedUsers, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('GET live list error:', error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// 📤 POST - ENG MUHIM QISM: To'g'ri IP va Country saqlash
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      testId, userId, sessionId, name, progress, total, status,
      device, currentAnswer, stars, theme, questionId, visualState,
      difficulty, cameraStatus, cameraSnapshot, cameraUpdatedAt,
    } = body;

    const reqInfo = extractRequestInfo(request);

    if (isBlocked(reqInfo.ip, userId)) {
      return NextResponse.json({ error: 'Blocked' }, { status: 403 });
    }

    // ✅ FIX: Cloudflare headerlaridan TO'G'RI IP va Country olamiz
    const headers = request.headers;

    // Real client IP: Cloudflare cf-connecting-ip dan
    const realIp = headers.get('cf-connecting-ip')
      || reqInfo.ip
      || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown';

    // Real country: Cloudflare cf-ipcountry dan
    const realCountry = headers.get('cf-ipcountry')
      || headers.get('x-vercel-ip-country')
      || null;

    // Real coordinates: Cloudflare cf-iplatitude / cf-iplongitude / cf-ipcity dan
    // (requires "Add visitor location headers" Managed Transform in Cloudflare dashboard)
    const realLat = parseFloat(headers.get('cf-iplatitude')) || null;
    const realLng = parseFloat(headers.get('cf-iplongitude')) || null;
    const realCity = headers.get('cf-ipcity') || null;

    // Client GPS coordinates (from browser Geolocation API)
    // If GPS provided, it's more accurate than Cloudflare IP location
    const gpsLat = body?.gpsLat ? parseFloat(body.gpsLat) : null;
    const gpsLng = body?.gpsLng ? parseFloat(body.gpsLng) : null;
    const gpsAccuracy = body?.gpsAccuracy ? parseFloat(body.gpsAccuracy) : null;

    // Priority: GPS > Cloudflare > ipwho.is fallback
    let finalLat = gpsLat || realLat || null;
    let finalLng = gpsLng || realLng || null;
    let finalCity = realCity || null;
    let locationSource = gpsLat ? 'gps' : (realLat ? 'cloudflare' : null);

    // For Cloudflare, city is available from header
    if (gpsLat) {
      locationSource = 'gps';
    } else if (realLat) {
      locationSource = 'cloudflare';
    }

    const key = sessionId || userId;
    const resolvedStatus = status || (testId ? 'in-test' : (name ? 'browsing' : 'registering'));

    const safeSnapshot = (typeof cameraSnapshot === 'string'
      && cameraSnapshot.startsWith('data:image/')
      && cameraSnapshot.length <= 260000)
      ? cameraSnapshot
      : null;

    activeSessions[key] = {
      testId, userId, sessionId,
      name: name || 'Registering...',
      progress: progress || 0,
      total: total || 0,
      difficulty: difficulty || null,
      status: resolvedStatus,
      device: device || 'desktop',
      ip: realIp,                    // ✅ REAL client IP
      country: realCountry || 'UZ',  // ✅ TO'G'RI country saqlanadi
      lat: finalLat,                 // 📍 Latitude (GPS > Cloudflare > ipwho.is)
      lng: finalLng,                 // 📍 Longitude
      city: finalCity,               // 🏙️ City
      locationSource: locationSource, // 'gps' | 'cloudflare' | 'ipwhois' | null
      gpsAccuracy: gpsAccuracy,      // GPS accuracy in meters (if from GPS)
      currentAnswer: currentAnswer || null,
      visualState: visualState || null,
      cameraStatus: cameraStatus || null,
      cameraSnapshot: safeSnapshot,
      cameraUpdatedAt: cameraUpdatedAt || null,
      stars: stars || 0,
      theme: theme || 'light',
      questionId: questionId || null,
      lastUpdated: Date.now()
    };

    if (testId && status === 'in-test' && progress === 0) {
      logActivity({
        ...reqInfo, type: 'test_start', userName: name, userId,
        details: { testId, device: device || 'desktop' },
        country: realCountry || 'UZ', deviceId: userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');

  if (sessionId && activeSessions[sessionId]) {
    delete activeSessions[sessionId];
  } else if (userId) {
    Object.keys(activeSessions).forEach(key => {
      if (activeSessions[key].userId === userId) {
        delete activeSessions[key];
      }
    });
  }

  return NextResponse.json({ success: true });
}