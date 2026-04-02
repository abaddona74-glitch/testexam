import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BlockedIP from '@/models/BlockedIP';
import { logActivity } from '@/lib/activity-logger';
import { requireAdminAuth } from '@/lib/admin-auth';

// Initialize global blocked cache
if (!global._blockedCache) {
  global._blockedCache = {
    ips: new Set(),
    deviceIds: new Set(),
    userNames: new Set(),
    userNameReasons: new Map(),
    loaded: false,
  };
}
if (!global._blockedCache.userNameReasons) {
  global._blockedCache.userNameReasons = new Map();
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
    const normalizedUsers = blocked
      .filter(b => b.userName)
      .map(b => ({
        userName: String(b.userName).trim().toLowerCase(),
        reason: typeof b.reason === 'string' && b.reason.trim() ? b.reason.trim() : 'Blocked by admin',
      }))
      .filter(entry => entry.userName);
    global._blockedCache.userNames = new Set(normalizedUsers.map(entry => entry.userName));
    global._blockedCache.userNameReasons = new Map(
      normalizedUsers.map(entry => [entry.userName, entry.reason])
    );
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

/**
 * Check if a comment userName is blocked
 */
export function isUserNameBlocked(userName) {
  const cache = global._blockedCache;
  if (!cache.loaded) return false;
  if (!userName) return false;
  const normalized = String(userName).trim().toLowerCase();
  if (!normalized) return false;
  return cache.userNames.has(normalized);
}

export function getUserNameBlockReason(userName) {
  const cache = global._blockedCache;
  if (!cache.loaded) return null;
  if (!userName) return null;
  const normalized = String(userName).trim().toLowerCase();
  if (!normalized) return null;
  return cache.userNameReasons.get(normalized) || 'Blocked by admin';
}

// GET - List blocked IPs/devices
export async function GET(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

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
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await dbConnect();

  try {
    const { ip, deviceId, userName, reason, duration } = await request.json();
    const normalizedUserName = typeof userName === 'string' ? userName.trim() : '';

    if (!ip && !deviceId && !normalizedUserName) {
      return NextResponse.json({ error: 'IP, deviceId, or userName required' }, { status: 400 });
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
    if (normalizedUserName) existingQuery.userName = normalizedUserName;
    
    const existing = await BlockedIP.findOne({ ...existingQuery, isActive: true });
    if (existing) {
      return NextResponse.json({ error: 'Already blocked', existing }, { status: 409 });
    }

    const blocked = await BlockedIP.create({
      ip,
      deviceId,
      userName: normalizedUserName || undefined,
      reason: reason || 'Blocked by admin',
      expiresAt,
    });

    // Update in-memory cache
    if (ip) global._blockedCache.ips.add(ip);
    if (deviceId) global._blockedCache.deviceIds.add(deviceId);
    if (normalizedUserName) {
      const normalized = normalizedUserName.toLowerCase();
      const normalizedReason = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Blocked by admin';
      global._blockedCache.userNames.add(normalized);
      global._blockedCache.userNameReasons.set(normalized, normalizedReason);
    }

    // Log the action
    await logActivity({
      type: 'block_action',
      details: { action: 'block', ip, deviceId, userName: normalizedUserName || null, reason, duration },
    });

    return NextResponse.json({ success: true, blocked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 });
  }
}

// DELETE - Unblock an IP/device
export async function DELETE(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

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
    if (blocked.userName) {
      const normalized = String(blocked.userName).trim().toLowerCase();
      global._blockedCache.userNames.delete(normalized);
      global._blockedCache.userNameReasons.delete(normalized);
    }

    await logActivity({
      type: 'block_action',
      details: { action: 'unblock', ip: blocked.ip, deviceId: blocked.deviceId, userName: blocked.userName || null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
  }
}
