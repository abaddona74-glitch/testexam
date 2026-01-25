import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LicenseKey from '@/models/LicenseKey';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        const ip = getClientIp(request);
        // Limit: 3 requests per hour. Prevent mass generation of keys.
        if (!rateLimit(ip, 3, 60 * 60 * 1000)) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        await dbConnect();
        const { deviceId } = await request.json();

        if (!deviceId) {
            return NextResponse.json({ success: false, message: 'Device ID required' }, { status: 400 });
        }

        // Check for ANY trial key for this device (active OR used)
        const existingKey = await LicenseKey.findOne({ 
            generatedFor: deviceId
        });

        if (existingKey) {
            // If key exists, do NOT generate a new one.
            // Check if it's still "active" (unused). 
            if (existingKey.status === 'active') {
                 // Even if active, ensure we don't refresh the date forever.
                 // Only return it. Don't update createdAt.
                 return NextResponse.json({ 
                    success: true, 
                    key: existingKey.key,
                    message: 'Recovered existing trial key' 
                });
            } else {
                // It is 'used' or 'expired'
                return NextResponse.json({ 
                    success: false, 
                    message: 'Free trial already used on this device.' 
                });
            }
        }

        // Check if today is past the hard deadline (Jan 23, 2026)
        const deadline = new Date('2026-01-23T23:59:59');
        if (new Date() > deadline) {
             return NextResponse.json({ success: false, message: 'Free trial period has ended.' });
        }

        const randomSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        const newKeyString = `TRIAL-${randomSegment()}-${randomSegment()}-${randomSegment()}`;

        // Create new key
        const newLicense = await LicenseKey.create({
            key: newKeyString,
            type: 'daily', // Changed to daily as per request
            status: 'active',
            generatedFor: deviceId
        });

        return NextResponse.json({ 
            success: true, 
            key: newLicense.key,
            message: 'New trial key created'
        });

    } catch (error) {
        console.error('Trial Key Error:', error);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
