/**
 * Device Tier Detection Utility
 * 
 * Automatically detects device performance tier (low/medium/high)
 * based on CPU cores (hardwareConcurrency), RAM (deviceMemory),
 * and GPU capability (WebGL features).
 * 
 * Auto-initializes on import: if no performance mode is saved in localStorage,
 * runs detection and sets the appropriate tier so page.js picks it up automatically.
 * 
 * Privacy-friendly: No unique device fingerprinting, only coarse categorization.
 */

export function detectDeviceTier() {
  if (typeof window === 'undefined') {
    return { tier: 'high', score: 100, details: { cpuCores: 0, ram: 0, gpuTier: 'unknown' } };
  }

  // 1. CPU Cores (logical processors)
  const cpuCores = navigator.hardwareConcurrency || 0;

  // 2. RAM in GiB (Chromium only, otherwise 0)
  const ram = navigator.deviceMemory || 0;

  // 3. GPU capability via WebGL feature detection
  const gpuTier = detectGpuTier();

  // 4. Compute weighted score
  let score = 0;

  // CPU: 0–40 points
  if (cpuCores >= 12) score += 40;
  else if (cpuCores >= 8) score += 35;
  else if (cpuCores >= 6) score += 28;
  else if (cpuCores >= 4) score += 18;
  else if (cpuCores >= 2) score += 8;

  // RAM: 0–30 points
  if (ram >= 16) score += 30;
  else if (ram >= 8) score += 25;
  else if (ram >= 6) score += 18;
  else if (ram >= 4) score += 12;
  else if (ram >= 2) score += 5;

  // GPU: 0–30 points
  if (gpuTier === 'high') score += 30;
  else if (gpuTier === 'medium') score += 17;
  else if (gpuTier === 'low') score += 5;

  // 5. Determine final tier
  let tier;
  if (score >= 70) tier = 'high';
  else if (score >= 35) tier = 'medium';
  else tier = 'low';

  return {
    tier,
    score,
    details: {
      cpuCores,
      ram: ram || 'N/A',
      gpuTier
    }
  };
}

/**
 * Detect GPU tier via WebGL feature detection.
 * Checks max texture size, max varying vectors, and WebGL version.
 */
function detectGpuTier() {
  try {
    const canvas = document.createElement('canvas');
    
    // Try WebGL2 first
    let gl = canvas.getContext('webgl2');
    if (gl) {
      const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
      
      if (maxTexSize >= 16384 && maxVaryings >= 30) return 'high';
      if (maxTexSize >= 8192) return 'medium';
      return 'low';
    }

    // Fallback to WebGL1
    gl = canvas.getContext('webgl');
    if (gl) {
      const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS);
      
      if (maxTexSize >= 16384 && maxVaryings >= 20) return 'high';
      if (maxTexSize >= 4096) return 'medium';
      return 'low';
    }

    return 'low';
  } catch {
    return 'medium';
  }
}

/**
 * Get a human-readable label for a tier.
 */
export function getTierLabel(tier) {
  const labels = {
    high: { name: 'High', icon: '🚀', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', description: 'Full effects & animations' },
    medium: { name: 'Medium', icon: '⚡', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', description: 'Lighter animations' },
    low: { name: 'Low', icon: '🐢', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-700', description: 'Minimal effects' },
  };
  return labels[tier] || labels.medium;
}

/**
 * Run device detection and auto-set performance mode in localStorage.
 * Called on module import so page.js picks it up.
 */
export function autoDetectAndInit() {
  if (typeof window === 'undefined') return null;

  // Only auto-detect if user hasn't manually set a preference
  const existing = localStorage.getItem('examApp_performanceMode');
  if (existing === 'low' || existing === 'medium' || existing === 'high') {
    return existing;
  }

  // Run detection and save
  const result = detectDeviceTier();
  try {
    localStorage.setItem('examApp_performanceMode', result.tier);
    localStorage.setItem('examApp_deviceTier', JSON.stringify(result));
    // Also save timestamp so we know it was auto-detected
    localStorage.setItem('examApp_deviceTier_auto', 'true');
  } catch {}

  return result.tier;
}

/**
 * Get previously detected device info from localStorage.
 */
export function getStoredDeviceTier() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('examApp_deviceTier');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

/**
 * Check if current performance mode was auto-detected or user-set.
 */
export function isAutoDetected() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('examApp_deviceTier_auto') === 'true';
}

// Auto-initialize synchronously on import (only in browser)
// Runs before React useState initializers, so performance mode is set in localStorage
// before page.js reads it during first render
if (typeof window !== 'undefined') {
  autoDetectAndInit();
}
