/**
 * Security detection utilities
 * Detects injection attempts, DDoS patterns, and suspicious behavior
 */

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|FETCH|DECLARE|TRUNCATE)\b)/i,
  /('|"|;|--|\/\*|\*\/|xp_|sp_)/i,
  /(OR|AND)\s+\d+=\d+/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /INTO\s+(OUTFILE|DUMPFILE)/i,
  /LOAD_FILE\s*\(/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /INFORMATION_SCHEMA/i,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"']*["']?/i,
  /eval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /&#x?[0-9a-f]+;/i,
  /\balert\s*\(/i,
  /\bprompt\s*\(/i,
  /\bconfirm\s*\(/i,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/, 
  /%2e%2e/i,
  /%252e%252e/i,
  /etc\/passwd/i,
  /etc\/shadow/i,
  /proc\/self/i,
  /windows\/system32/i,
];

// Command injection patterns
const CMD_INJECTION_PATTERNS = [
  /;\s*(ls|cat|rm|wget|curl|bash|sh|python|perl|ruby|nc|netcat)/i,
  /\|\s*(ls|cat|rm|wget|curl|bash|sh|python|perl|ruby|nc|netcat)/i,
  /`[^`]+`/,
  /\$\([^)]+\)/,
];

/**
 * Check request/input for injection attempts
 * @param {string} input - The text to check
 * @returns {{ isInjection: boolean, type: string, pattern: string }}
 */
export function detectInjection(input) {
  if (!input || typeof input !== 'string') return { isInjection: false };
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { isInjection: true, type: 'sql_injection', pattern: pattern.toString() };
    }
  }
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return { isInjection: true, type: 'xss', pattern: pattern.toString() };
    }
  }
  
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return { isInjection: true, type: 'path_traversal', pattern: pattern.toString() };
    }
  }
  
  for (const pattern of CMD_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { isInjection: true, type: 'command_injection', pattern: pattern.toString() };
    }
  }
  
  return { isInjection: false };
}

/**
 * Deep scan all values in an object/body for injection
 */
export function deepScanForInjection(obj, path = '') {
  const results = [];
  
  if (!obj) return results;
  
  if (typeof obj === 'string') {
    const check = detectInjection(obj);
    if (check.isInjection) {
      results.push({ ...check, field: path, value: obj.substring(0, 200) });
    }
    return results;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...deepScanForInjection(item, `${path}[${i}]`));
    });
    return results;
  }
  
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      results.push(...deepScanForInjection(value, path ? `${path}.${key}` : key));
    }
  }
  
  return results;
}

// In-memory request tracking for DDoS detection
if (!global._dosTracker) {
  global._dosTracker = new Map();
}
const dosTracker = global._dosTracker;

/**
 * Track requests and detect potential DDoS/DoS
 * @param {string} ip
 * @returns {{ isDDoS: boolean, requestCount: number, windowMs: number, level: string }}
 */
export function detectDDoS(ip) {
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 1 minute window
  
  let record = dosTracker.get(ip);
  
  if (!record || (now - record.windowStart > WINDOW_MS)) {
    record = { windowStart: now, hits: [], totalRequests: 0 };
    dosTracker.set(ip, record);
  }
  
  // Clean old hits
  record.hits = record.hits.filter(t => now - t < WINDOW_MS);
  record.hits.push(now);
  record.totalRequests++;
  
  const requestCount = record.hits.length;
  
  // Cleanup tracker if too large
  if (dosTracker.size > 100000) {
    const oldEntries = [...dosTracker.entries()]
      .filter(([_, v]) => now - v.windowStart > WINDOW_MS * 5);
    oldEntries.forEach(([k]) => dosTracker.delete(k));
  }
  
  // Thresholds
  if (requestCount > 200) {
    return { isDDoS: true, requestCount, windowMs: WINDOW_MS, level: 'critical' };
  }
  if (requestCount > 100) {
    return { isDDoS: true, requestCount, windowMs: WINDOW_MS, level: 'high' };
  }
  if (requestCount > 50) {
    return { isDDoS: true, requestCount, windowMs: WINDOW_MS, level: 'medium' };
  }
  if (requestCount > 30) {
    return { isDDoS: false, requestCount, windowMs: WINDOW_MS, level: 'warning' };
  }
  
  return { isDDoS: false, requestCount, windowMs: WINDOW_MS, level: 'normal' };
}

/**
 * Get DDoS status for all tracked IPs
 */
export function getDDoSStatus() {
  const now = Date.now();
  const WINDOW_MS = 60 * 1000;
  const result = [];
  
  for (const [ip, record] of dosTracker.entries()) {
    const recentHits = record.hits.filter(t => now - t < WINDOW_MS);
    if (recentHits.length > 10) { // Only show IPs with significant traffic
      result.push({
        ip,
        requestCount: recentHits.length,
        totalRequests: record.totalRequests,
        firstSeen: new Date(record.windowStart).toISOString(),
      });
    }
  }
  
  return result.sort((a, b) => b.requestCount - a.requestCount);
}

export default { detectInjection, deepScanForInjection, detectDDoS, getDDoSStatus };
