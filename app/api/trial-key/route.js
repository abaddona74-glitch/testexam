import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LicenseKey from '@/models/LicenseKey';

export async function POST(request) {
    try {
        await dbConnect();
        const { deviceId } = await request.json();

        if (!deviceId) {
            return NextResponse.json({ success: false, message: 'Device ID required' }, { status: 400 });
        }

        // Check for existing non-activated trial key for this device
        const existingKey = await LicenseKey.findOne({ 
            generatedFor: deviceId,
            status: 'active'
        });

        const randomSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        const newKeyString = `TRIAL-${randomSegment()}-${randomSegment()}-${randomSegment()}`;

        if (existingKey) {
            // Update existing key
            existingKey.key = newKeyString;
            existingKey.createdAt = new Date();
            await existingKey.save();
            
            return NextResponse.json({ 
                success: true, 
                key: newKeyString,
                message: 'Existing trial key updated' 
            });
        }

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
