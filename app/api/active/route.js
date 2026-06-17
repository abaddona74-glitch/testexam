import { NextResponse } from 'next/server';
import { logActivity, extractRequestInfo } from '../../../lib/activity-logger';
import { isBlocked } from '../admin/block/route';

if (!global.activeSessions) {
    global.activeSessions = {};
}
let activeSessions = global.activeSessions;

// 🌐 JONLI GEOLOKATSIYA: So'rov bo'lgan soniyada IP-dan davlatni aniqlash
async function getLiveCountry(ip, vercelCountry) {
  try {
    // Agar Vercel aniq UZ desa, srazu UZ qaytaramiz
    if (vercelCountry && vercelCountry.toUpperCase() === 'UZ') {
      return 'UZ';
    }

    const isLocal = !ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:');
    const apiUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

    const response = await fetch(apiUrl, {
        cache: 'no-store', // Next.js keshini majburiy o'chirish 🚫
        next: { revalidate: 0 }
    });
    const data = await response.json();

    if (data.success && data.country_code) {
      return data.country_code.toUpperCase();
    }
    return 'UZ'; // Fallback
  } catch (e) {
    console.error("Live geo fetch failed:", e);
    return 'UZ';
  }
}

// 📥 REAL-TIME GET: Ro'yxat so'ralganda har bir IP uchun davlatni JONLI aniqlaydi
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    
    const now = Date.now();
    const BROWSING_TTL_MS = 30 * 1000;
    const AFK_TTL_MS = 2 * 60 * 1000;
    const IN_TEST_TTL_MS = 3 * 60 * 1000;

    // 1. Cleanup stale sessions
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

    // 2. Deduplicate by userId
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

    // 🔥 REAL-TIME SEHRI SHU YERDA: 
    // Ro'yxat frontendga ketishidan oldin, har bir faol foydalanuvchining joriy IP manzili 
    // tekshiriladi va davlati JONLI (REAL-TIME) o'zgartirib yuboriladi! ⏱️💥
    const updatedUsers = await Promise.all(
      finalUsers.map(async (user) => {
        // Agar foydalanuvchida IP bo'lsa, uni real-time tekshiramiz
        const liveCountryCode = await getLiveCountry(user.ip, null); 
        return {
          ...user,
          country: liveCountryCode, // Statik emas, ayni damdagi jonli davlat!
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

// 📤 POST: Faqat sessiya holatini va joriy IP-ni xotiraga yozadi (Davlat bu yerda aniqlanmaydi)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      testId,
      userId,
      sessionId,
      name,
      progress,
      total,
      status,
      device,
      currentAnswer,
      stars,
      theme,
      questionId,
      visualState,
      difficulty,
      cameraStatus,
      cameraSnapshot,
      cameraUpdatedAt,
    } = body;

    const reqInfo = extractRequestInfo(request);

    if (isBlocked(reqInfo.ip, userId)) {
      return NextResponse.json({ error: 'Blocked' }, { status: 403 });
    }
    
    const key = sessionId || userId; 
    const resolvedStatus = status || (testId ? 'in-test' : (name ? 'browsing' : 'registering'));

    const safeSnapshot = (typeof cameraSnapshot === 'string'
      && cameraSnapshot.startsWith('data:image/')
      && cameraSnapshot.length <= 260000)
      ? cameraSnapshot
      : null;

    // Xotiraga faqat jonli IP yoziladi, country esa GET so'rovida dinamik hisoblanadi! 🛡️
    activeSessions[key] = {
        testId,
        userId,
        sessionId,
        name: name || 'Registering...',
        progress: progress || 0,
        total: total || 0,
        difficulty: difficulty || null,
        status: resolvedStatus,
        device: device || 'desktop', 
        ip: reqInfo.ip, // 👈 Faqat IP-ni saqlaymiz
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
        country: 'UZ', deviceId: userId,
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
    } 
    else if (userId) {
         Object.keys(activeSessions).forEach(key => {
            if (activeSessions[key].userId === userId) {
                 delete activeSessions[key];
            }
         });
    }
    
    return NextResponse.json({ success: true });
}