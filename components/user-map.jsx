'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import 'leaflet/dist/leaflet.css';

/**
 * UserMap - Displays active users on an interactive Leaflet map
 * Shows markers at user locations with country, name, and status info.
 * Uses GPS > Cloudflare > IP location priority.
 * 
 * Note: Leaflet CSS must be imported in app/globals.css or a layout:
 *   @import 'leaflet/dist/leaflet.css';
 */
export default function UserMap({ users = [], height = '400px' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [mapReady, setMapReady] = useState(false);
  const [L, setL] = useState(null);

  // Load Leaflet dynamically (SSR-safe)
  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      try {
        const leafletModule = await import('leaflet');
        if (!cancelled) {
          setL(() => leafletModule);
        }
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    }

    loadLeaflet();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [41.3, 69.2], // Default: Tashkent
      zoom: 5,
      zoomControl: false, // We'll add it at bottom-right
      attributionControl: true,
    });

    // Primary: static tiles from public/tiles/ (served by Vercel edge CDN, zero cold start)
    // Fallback: /api/tiles proxies from Esri for tiles we didn't pre-download
    const tileLayer = L.tileLayer('/tiles/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    // On tile error: fallback to API proxy
    tileLayer.on('tileerror', (e) => {
      const src = e.tile.src;
      // Only retry if not already a fallback request
      if (!src.includes('/api/tiles')) {
        const match = src.match(/\/tiles\/(\d+)\/(\d+)\/(\d+)\.png/);
        if (match) {
          e.tile.src = `/api/tiles?z=${match[1]}&x=${match[2]}&y=${match[3]}`;
        }
      }
    });

    // Zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Fullscreen button as Leaflet control (matches zoom button style)
    const fsControl = L.control({ position: 'bottomright' });
    fsControl.onAdd = () => {
      const btn = L.DomUtil.create('button', 'leaflet-control-zoom leaflet-bar');
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/>
          <polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/>
          <line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      `;
      btn.title = 'Fullscreen';
      btn.style.cssText = 'width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:white;border:2px solid rgba(0,0,0,0.2);background-clip:padding-box;border-radius:2px;';
      btn.onclick = () => toggleFullscreen(map);
      return btn;
    };
    fsControl.addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate size after mount to fix rendering
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  // Update markers when users change
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !mapReady) return;

    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    // Get current user IDs
    const currentUserIds = new Set(users.map((u) => u.userId || u.sessionId || 'anon'));
    const markerIds = new Set(Object.keys(markers));

    // Remove markers for users who left
    for (const id of markerIds) {
      if (!currentUserIds.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    }

    // Add/update markers
    const validMarkers = [];
    for (const user of users) {
      const id = user.userId || user.sessionId || 'anon';
      const lat = parseFloat(user.lat);
      const lng = parseFloat(user.lng);

      // Skip users without valid coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

      const isInTest = user.status === 'in-test';
      const statusColor = isInTest ? '#16a34a' : '#2563eb';
      const deviceIcon = user.device === 'mobile' ? '📱' : '🖥️';
      const sourceIcon = user.locationSource === 'gps' ? '📍' : '🌐';

      // Create custom marker icon with dark bg + text-shadow for visibility
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${statusColor};
            color: white;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            border: 2px solid rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          ">
            <span>${user.country ? user.country : '🌍'}</span>
            <span style="overflow: hidden; text-overflow: ellipsis;">${user.name || 'User'}</span>
          </div>
        `,
        iconSize: [200, 30],
        iconAnchor: [100, 15],
      });

      if (markers[id]) {
        // Update existing marker
        markers[id].setLatLng([lat, lng]);
        markers[id].setIcon(icon);
        markers[id].setPopupContent(createPopupContent(user, sourceIcon, deviceIcon));
      } else {
        // Create new marker
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(createPopupContent(user, sourceIcon, deviceIcon), {
          maxWidth: 250,
          className: 'user-map-popup',
        });
        markers[id] = marker;
      }

      validMarkers.push(markers[id]);
    }

    // Fit bounds to show all markers (if any)
    if (validMarkers.length > 0) {
      try {
        const group = L.featureGroup(validMarkers);
        map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 10 });
      } catch {
        // If fitBounds fails, just keep current view
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, mapReady, L]);

  const toggleFullscreen = (map) => {
    const el = mapRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
      // Invalidate map size after fullscreen transition
      setTimeout(() => map?.invalidateSize(), 500);
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      setTimeout(() => map?.invalidateSize(), 500);
    }
  };

  // Listen for fullscreen change to resize map
  useEffect(() => {
    const handleFsChange = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  if (!L) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl"
        style={{ height }}
      >
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <div ref={mapRef} style={{ width: '100%', height }} className="z-0" />

      {/* Legend overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-2 text-[10px] shadow-lg space-y-1.5">
        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">📍 Legend</div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">In test</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Browsing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">📍</span>
          <span className="text-gray-600 dark:text-gray-400">GPS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🌐</span>
          <span className="text-gray-600 dark:text-gray-400">IP location</span>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
        <span className="text-gray-600 dark:text-gray-400">
          👥 {users.length} users
          {users.filter(u => u.lat && u.lng).length > 0 && (
            <> · 📍 {users.filter(u => u.lat && u.lng).length} on map</>
          )}
          {users.filter(u => u.locationSource === 'gps').length > 0 && (
            <> · 📡 {users.filter(u => u.locationSource === 'gps').length} GPS</>
          )}
        </span>
      </div>


    </div>
  );
}

/**
 * Create popup HTML content for a user marker
 */
function createPopupContent(user, sourceIcon, deviceIcon) {
  const isInTest = user.status === 'in-test';
  return `
    <div style="font-family: system-ui, sans-serif; min-width: 180px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <span>${user.country ? user.country : '🌍'}</span>
        <span>${user.name || 'Anonymous'}</span>
      </div>
      <div style="font-size: 11px; color: #6b7280; line-height: 1.6;">
        <div>${deviceIcon} ${user.device || 'desktop'}</div>
        <div>${sourceIcon} ${user.locationSource === 'gps' ? 'GPS (exact)' : user.locationSource === 'cloudflare' ? 'Cloudflare IP' : 'IP location'}</div>
        ${user.city ? `<div>🏙️ ${user.city}</div>` : ''}
        <div>${isInTest ? '🟢 In test' : '🔍 Browsing'}</div>
        ${user.testId ? `<div>📝 ${user.testId.split('/').pop() || user.testId}</div>` : ''}
        ${user.progress && user.total ? `<div>📊 ${user.progress}/${user.total}</div>` : ''}
        <div>⭐ ${user.stars || 0} stars</div>
        <div style="color: #9ca3af; font-size: 10px; margin-top: 4px;">
          ${user.lastUpdated ? new Date(user.lastUpdated).toLocaleTimeString() : ''}
        </div>
      </div>
    </div>
  `;
}
