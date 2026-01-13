import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LicenseKey from '@/models/LicenseKey';

export async function POST(request) {
    try {
        await dbConnect();
        const { key, userId } = await request.json();

        if (!key || !userId) {
            return NextResponse.json({ success: false, message: 'Key and UserID required' }, { status: 400 });
        }

        const license = await LicenseKey.findOne({ key });

        if (!license) {
            // Fallback for hardcoded keys (Legacy support if you still want tokens like trial2026 to work for everyone)
            // But for security, you should remove this part eventually.
            if (key === 'trial2026' || key === 'PREMIUM-WEEK-2026') {
                 return NextResponse.json({ 
                    success: true, 
                    expiryDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
                    type: 'weekly' 
                });
            }
            return NextResponse.json({ success: false, message: 'Invalid License Key' }, { status: 404 });
        }

        const now = Date.now();

        // 1. If key is completely new/active
        if (license.status === 'active') {
            const duration = 7 * 24 * 60 * 60 * 1000; // 1 week
            
            license.status = 'used';
            license.usedBy = userId;
            license.activatedAt = now;
            license.expiresAt = new Date(now + duration);
            await license.save();

            return NextResponse.json({ 
                success: true, 
                expiryDate: license.expiresAt.getTime(),
                type: license.type
            });
        }

        // 2. If key is already used
        if (license.status === 'used') {
            // Check if it belongs to THIS user
            if (license.usedBy === userId) {
                // Check if expired
                if (new Date(license.expiresAt).getTime() < now) {
                     license.status = 'expired';
                     await license.save();
                     return NextResponse.json({ success: false, message: 'Subscription expired' }, { status: 403 });
                }

                // Still valid for this user
                return NextResponse.json({ 
                    success: true, 
                    expiryDate: new Date(license.expiresAt).getTime(),
                    type: license.type
                });
            } else {
                // Used by someone else
                return NextResponse.json({ success: false, message: 'This key is already used on another device' }, { status: 403 });
            }
        }

        // 3. Expired
        if (license.status === 'expired') {
            return NextResponse.json({ success: false, message: 'License key expired' }, { status: 403 });
        }

        return NextResponse.json({ success: false, message: 'Unknown error' }, { status: 500 });
        
    } catch (error) {
        console.error("License check error:", error);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
