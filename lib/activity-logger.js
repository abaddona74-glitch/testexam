import dbConnect from './mongodb';
import ActivityLog from '../models/ActivityLog';

/**
 * Log an activity to the database
 * Non-blocking: errors are caught silently to not affect main request
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
  try {
    await dbConnect();
    await ActivityLog.create({
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
      isSuspicious,
      suspiciousReason,
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

/**
 * Extract common request info for logging
 */
export function extractRequestInfo(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';
  const region = request.headers.get('x-vercel-ip-region') || 'Unknown';
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

export default { logActivity, extractRequestInfo };
