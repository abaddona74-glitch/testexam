import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Test from '@/models/Test';
import { logActivity } from '@/lib/activity-logger';
import { requireAdminAuth } from '@/lib/admin-auth';

// GET - List all tests for admin management
export async function GET(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await dbConnect();

  try {
    const tests = await Test.find({})
      .select('name folder createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Add question count for each test
    const testsWithCount = tests.map(t => ({
      ...t,
      questionsCount: t.content?.test_questions?.length || 0,
    }));

    return NextResponse.json({ tests: testsWithCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

// DELETE - Delete a test
export async function DELETE(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
  }

  try {
    const test = await Test.findByIdAndDelete(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    await logActivity({
      type: 'admin_action',
      details: { action: 'delete_test', testId: id, testName: test.name },
    });

    return NextResponse.json({ success: true, deleted: test.name });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}
