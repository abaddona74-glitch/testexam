import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlockedIP from '@/models/BlockedIP';
import { logActivity } from '@/lib/activity-logger';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

function checkAuth(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === ADMIN_SECRET;
}

// Initialize global blocked cache
if (!global._blockedCache) {
  global._blockedCache = { ips: new Set(), deviceIds: new Set(), loaded: false };
}

/**
 * Load blocked IPs/devices from DB into memory cache
 */
export async function loadBlockedCache() {
  try {
    await dbConnect();
    const blocked = await BlockedIP.find({ isActive: true }).lean();
    global._blockedCache.ips = new Set(blocked.filter(b => b.ip).map(b => b.ip));
    global._blockedCache.deviceIds = new Set(blocked.filter(b => b.deviceId).map(b => b.deviceId));
    global._blockedCache.loaded = true;
  } catch (err) {
    console.error('Failed to load blocked cache:', err.message);
  }
}

/**
 * Check if IP or deviceId is blocked
 */
export function isBlocked(ip, deviceId) {
  const cache = global._blockedCache;
  if (!cache.loaded) return false; // Don't block if cache not loaded yet
  
  if (ip && cache.ips.has(ip)) return true;
  if (deviceId && cache.deviceIds.has(deviceId)) return true;
  return false;
}

// GET - List blocked IPs/devices
export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  // Ensure cache is loaded
  if (!global._blockedCache.loaded) await loadBlockedCache();

  try {
    const blocked = await BlockedIP.find({})
      .sort({ blockedAt: -1 })
      .lean();

    return NextResponse.json({ blocked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST - Block an IP or device
export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    const { ip, deviceId, reason, duration } = await request.json();

    if (!ip && !deviceId) {
      return NextResponse.json({ error: 'IP or deviceId required' }, { status: 400 });
    }

    let expiresAt = null;
    if (duration) {
      const durationMap = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'permanent': null,
      };
      const ms = durationMap[duration];
      if (ms) expiresAt = new Date(Date.now() + ms);
    }

    // Check if already blocked
    const existingQuery = {};
    if (ip) existingQuery.ip = ip;
    if (deviceId) existingQuery.deviceId = deviceId;
    
    const existing = await BlockedIP.findOne({ ...existingQuery, isActive: true });
    if (existing) {
      return NextResponse.json({ error: 'Already blocked', existing }, { status: 409 });
    }

    const blocked = await BlockedIP.create({
      ip,
      deviceId,
      reason: reason || 'Blocked by admin',
      expiresAt,
    });

    // Update in-memory cache
    if (ip) global._blockedCache.ips.add(ip);
    if (deviceId) global._blockedCache.deviceIds.add(deviceId);

    // Log the action
    await logActivity({
      type: 'block_action',
      details: { action: 'block', ip, deviceId, reason, duration },
    });

    return NextResponse.json({ success: true, blocked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 });
  }
}

// DELETE - Unblock an IP/device
export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const blocked = await BlockedIP.findById(id);
    if (!blocked) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Deactivate instead of delete (keep history)
    blocked.isActive = false;
    await blocked.save();

    // Update cache
    if (blocked.ip) global._blockedCache.ips.delete(blocked.ip);
    if (blocked.deviceId) global._blockedCache.deviceIds.delete(blocked.deviceId);

    await logActivity({
      type: 'block_action',
      details: { action: 'unblock', ip: blocked.ip, deviceId: blocked.deviceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
  }
}
