import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request) {
    try {
        const ip = getClientIp(request);
        // Limit: 5 reports per 10 minutes
        if (!rateLimit(ip, 5, 10 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Too many reports submitted. Please try again later." },
                { status: 429 }
            );
        }

        await dbConnect();
        
        const body = await request.json();
        const { testId, questionId, questionText, reason, user } = body;

        const newReport = await Report.create({
            testId,
            questionId,
            questionText,
            reason,
            user,
        });

        return NextResponse.json({ success: true, report: newReport });
    } catch (error) {
        console.error('Report submission error:', error);
        return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }
}
