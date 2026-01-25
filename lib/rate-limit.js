
const rateLimitMap = new Map();

export function rateLimit(ip, limit = 10, windowMs = 60 * 1000) {
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

    // Reset if window passed
    if (now - record.startTime > windowMs) {
        record.count = 1;
        record.startTime = now;
    } else {
        record.count++;
    }

    rateLimitMap.set(ip, record);

    // Memory cleanup: Clear map if it gets too large (prevent memory leaks)
    if (rateLimitMap.size > 50000) {
        rateLimitMap.clear();
    }

    return record.count <= limit;
}

export function getClientIp(request) {
    let ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1';
             
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    return ip;
}
