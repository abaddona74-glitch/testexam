import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'reports.json');

function getReports() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, '[]');
            return [];
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveReports(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { testId, questionId, questionText, reason, user } = body;

        const newReport = {
            id: Date.now().toString(),
            testId,
            questionId,
            questionText,
            reason,
            user,
            date: new Date().toISOString()
        };

        const reports = getReports();
        reports.push(newReport);
        saveReports(reports);

        return NextResponse.json({ success: true, report: newReport });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }
}
