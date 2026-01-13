import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LicenseKey from '@/models/LicenseKey';

export async function POST(request) {
    try {
        await dbConnect();
        const { adminSecret, count = 1, type = 'weekly' } = await request.json();

        // Simple protection. In production, use real auth.
        // CHANGE THIS TO YOUR OWN SECRET PASSWORD
        if (adminSecret !== 'admin123') { 
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

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
