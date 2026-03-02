import dbConnect from './mongodb';
import ActivityLog from '../models/ActivityLog';

// ─── In-Memory Real-Time Event Bus ─────────────────────────
// Events are pushed here INSTANTLY when any action happens.
// Admin dashboard reads from this for real-time updates (no DB delay).
// MongoDB write happens async in background with retry.
if (!global._eventBus) {
  global._eventBus = {
    events: [],       // circular buffer of recent events
    counter: 0,       // monotonically increasing event ID
    maxEvents: 500,   // keep last 500 events in memory
  };
}

/**
 * Push event to in-memory bus (instant, no DB)
 */
function pushEvent(eventData) {
  const bus = global._eventBus;
  const event = {
    ...eventData,
    _eventId: ++bus.counter,
    _ts: Date.now(),
  };
  bus.events.push(event);
  // Trim old events
  if (bus.events.length > bus.maxEvents) {
    bus.events = bus.events.slice(-bus.maxEvents);
  }
}

/**
 * Get events since a given eventId (for admin polling)
 * @param {number} sinceId - return events with _eventId > sinceId
 * @returns {{ events: Array, lastEventId: number }}
 */
export function getEventsSince(sinceId = 0) {
  const bus = global._eventBus;
  const newEvents = bus.events.filter(e => e._eventId > sinceId);
  return {
    events: newEvents,
    lastEventId: bus.counter,
  };
}

// ─── MongoDB Write with Retry ───────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 2000, 5000]; // ms

async function writeToDBWithRetry(data, attempt = 0) {
  try {
    await dbConnect();
    await ActivityLog.create(data);
  } catch (err) {
    console.error(`Activity log DB write error (attempt ${attempt + 1}):`, err.message);
    if (attempt < MAX_RETRIES - 1) {
      // Retry after delay
      setTimeout(() => {
        writeToDBWithRetry(data, attempt + 1);
      }, RETRY_DELAYS[attempt] || 5000);
    } else {
      console.error('Activity log FAILED after all retries:', data.type, data.ip);
    }
  }
}

/**
 * Log an activity — pushes to memory instantly + writes to DB with retry
 * Non-blocking: never throws, never delays the caller
 */
export async function logActivity({
  type,
  ip,
  userAgent,
  userId,
  userName,
  path,
  method,
  statusCode,
  details,
  country,
  city,
  region,
  deviceId,
  isSuspicious = false,
  suspiciousReason,
}) {
  const eventData = {
    type, ip, userAgent, userId, userName, path, method,
    statusCode, details, country, city, region, deviceId,
    isSuspicious, suspiciousReason,
    createdAt: new Date(),
  };

  // 1. INSTANT: Push to in-memory event bus (admin sees it immediately)
  pushEvent(eventData);

  // 2. ASYNC: Write to MongoDB with retry (non-blocking)
  writeToDBWithRetry(eventData);
}

/**
 * Extract common request info for logging
 */
export function extractRequestInfo(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const country = request.headers.get('x-vercel-ip-country') || request.headers.get('x-geo-country') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || request.headers.get('x-geo-city') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-region') || request.headers.get('x-geo-region') || 'Unknown';
  const url = new URL(request.url);
  
  return {
    ip,
    userAgent,
    country,
    city,
    region,
    path: url.pathname,
    method: request.method,
  };
}

export default { logActivity, extractRequestInfo, getEventsSince };
