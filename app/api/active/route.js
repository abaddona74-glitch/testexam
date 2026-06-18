import { NextResponse } from 'next/server';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { isBlocked } from '../admin/block/route';

if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

// 🌐 IP dan country aniqlash (faqat zarurat bo'lganda)
async function getCountryFromIP(ip) {
  try {
    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');
    if (isLocal) return 'UZ';

    const response = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(3000)
    });
    const data = await response.json();

    if (data.success && data.country_code) {
      return data.country_code.toUpperCase();
    }
    return 'UZ';
  } catch (e) {
    return 'UZ';
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
        let liveCountryCode = user.country || 'UZ';

        // Agar country yo'q yoki noto'g'ri bo'lsa, API dan so'raymiz
        if (!liveCountryCode || liveCountryCode === 'XX' || liveCountryCode.length !== 2) {
          liveCountryCode = await getCountryFromIP(user.ip);
        }

        return {
          ...user,
          country: liveCountryCode,
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