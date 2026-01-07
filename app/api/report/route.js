import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';

export async function POST(request) {
    try {
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
