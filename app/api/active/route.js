import { NextResponse } from 'next/server';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { isBlocked } from '../admin/block/route';
import dbConnect from '@/lib/mongodb';
import SessionStore from '@/models/SessionStore';

if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

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

async function cleanStaleSessions(now) {
  const BROWSING_TTL_MS = 30 * 1000;
  const AFK_TTL_MS = 2 * 60 * 1000;
  const IN_TEST_TTL_MS = 3 * 60 * 1000;

  // Clean in-memory
  Object.keys(activeSessions).forEach(key => {
    const session = activeSessions[key];
    const ttl = session?.status === 'afk'
      ? AFK_TTL_MS
      : (session?.status === 'in-test' || session?.testId) ? IN_TEST_TTL_MS : BROWSING_TTL_MS;
    if (!session?.lastUpdated || (now - session.lastUpdated > ttl)) {
      delete activeSessions[key];
    }
  });
}

async function loadSessionsFromDB() {
  try {
    await dbConnect();
    const cutoff = new Date(Date.now() - 3 * 60 * 1000);
    const docs = await SessionStore.find({ lastUpdated: { $gte: cutoff } }).lean();
    for (const doc of docs) {
      activeSessions[doc.sessionId || doc.userId] = {
        testId: doc.testId,
        userId: doc.userId,
        sessionId: doc.sessionId,
        name: doc.name || 'Registering...',
        progress: doc.progress || 0,
        total: doc.total || 0,
        difficulty: doc.difficulty || null,
        status: doc.status || 'browsing',
        device: doc.device || 'desktop',
        ip: doc.ip,
        country: doc.country || 'UZ',
        lat: doc.lat || null,
        lng: doc.lng || null,
        city: doc.city || null,
        locationSource: doc.locationSource || null,
        gpsAccuracy: doc.gpsAccuracy || null,
        cameraStatus: doc.cameraStatus || null,
        cameraSnapshot: doc.cameraSnapshot || null,
        cameraUpdatedAt: doc.cameraUpdatedAt || null,
        stars: doc.stars || 0,
        theme: doc.theme || 'light',
        lastUpdated: doc.lastUpdated?.getTime() || Date.now(),
      };
    }
  } catch (e) {
    console.error('Failed to load sessions from DB:', e.message);
  }
}

async function saveSessionToDB(session) {
  try {
    await dbConnect();
    const key = session.sessionId || session.userId;
    await SessionStore.findOneAndUpdate(
      { sessionId: key },
      {
        $set: {
          userId: session.userId,
          name: session.name,
          ip: session.ip,
          country: session.country,
          city: session.city,
          lat: session.lat,
          lng: session.lng,
          locationSource: session.locationSource,
          gpsAccuracy: session.gpsAccuracy,
          cameraStatus: session.cameraStatus,
          cameraSnapshot: session.cameraSnapshot,
          cameraUpdatedAt: session.cameraUpdatedAt,
          device: session.device,
          status: session.status,
          testId: session.testId,
          difficulty: session.difficulty,
          progress: session.progress,
          total: session.total,
          stars: session.stars,
          theme: session.theme,
          lastUpdated: new Date(),
          startedAt: session.startedAt ? new Date(session.startedAt) : undefined,
          startedTestId: session.startedTestId,
        },
      },
      { upsert: true }
    );
  } catch (e) {
    console.error('Failed to save session to DB:', e.message);
  }
}

async function removeSessionFromDB(key) {
  try {
    await dbConnect();
    await SessionStore.deleteOne({ sessionId: key });
  } catch (e) {
    console.error('Failed to remove session from DB:', e.message);
  }
}

// 📥 GET
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    const now = Date.now();

    // Agar in-memory bo'sh bo'lsa (cold start), DB dan yuklaymiz
    if (Object.keys(activeSessions).length === 0) {
      await loadSessionsFromDB();
    }

    await cleanStaleSessions(now);

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

    const updatedUsers = await Promise.all(
      finalUsers.map(async (user) => {
        let result = {
          country: user.country || 'UZ',
          lat: user.lat || null,
          lng: user.lng || null,
          city: user.city || null,
          locationSource: user.locationSource || 'ip',
        };

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

// 📤 POST
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

    const headers = request.headers;

    const realIp = headers.get('cf-connecting-ip')
      || reqInfo.ip
      || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown';

    const realCountry = headers.get('cf-ipcountry')
      || headers.get('x-vercel-ip-country')
      || null;

    const realLat = parseFloat(headers.get('cf-iplatitude')) || null;
    const realLng = parseFloat(headers.get('cf-iplongitude')) || null;
    const realCity = headers.get('cf-ipcity') || null;

    const gpsLat = body?.gpsLat ? parseFloat(body.gpsLat) : null;
    const gpsLng = body?.gpsLng ? parseFloat(body.gpsLng) : null;
    const gpsAccuracy = body?.gpsAccuracy ? parseFloat(body.gpsAccuracy) : null;

    let finalLat = gpsLat || realLat || null;
    let finalLng = gpsLng || realLng || null;
    let finalCity = realCity || null;
    let locationSource = gpsLat ? 'gps' : (realLat ? 'cloudflare' : null);

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

    const sessionData = {
      testId, userId, sessionId,
      name: name || 'Registering...',
      progress: progress || 0,
      total: total || 0,
      difficulty: difficulty || null,
      status: resolvedStatus,
      device: device || 'desktop',
      ip: realIp,
      country: realCountry || 'UZ',
      lat: finalLat,
      lng: finalLng,
      city: finalCity,
      locationSource: locationSource,
      gpsAccuracy: gpsAccuracy,
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

    // In-memory (instant)
    activeSessions[key] = sessionData;

    // MongoDB (await — boshqa instance'lar ham ko'rishi uchun)
    await saveSessionToDB(sessionData);

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
    removeSessionFromDB(sessionId);
  } else if (userId) {
    Object.keys(activeSessions).forEach(key => {
      if (activeSessions[key].userId === userId) {
        delete activeSessions[key];
        removeSessionFromDB(key);
      }
    });
  }

  return NextResponse.json({ success: true });
}
