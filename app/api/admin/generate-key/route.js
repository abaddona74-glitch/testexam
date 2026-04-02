import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LicenseKey from '@/models/LicenseKey';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function POST(request) {
    try {
        const authError = requireAdminAuth(request);
        if (authError) return authError;

        const ip = getClientIp(request);
        // Strict Limit: 5 attempts per minute prevents brute force
        if (!rateLimit(ip, 5, 60 * 1000)) {
            return NextResponse.json(
                { success: false, message: 'Too many attempts. Please wait.' }, 
                { status: 429 }
            );
        }

        await dbConnect();
        const { count = 1, type = 'weekly' } = await request.json();

        const keys = [];
        for (let i = 0; i < count; i++) {
            // Generate random key: XXXX-XXXX-XXXX
            const randomSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            const key = `KEY-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
            
            keys.push({
                key,
                type,
                status: 'active'
            });
        }

        await LicenseKey.insertMany(keys);

        return NextResponse.json({ success: true, keys: keys.map(k => k.key) });
        
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
