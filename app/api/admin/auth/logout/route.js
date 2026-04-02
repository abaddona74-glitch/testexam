import { NextResponse } from 'next/server';
import { clearAdminAuthCookies, requireAdminAuth } from '@/lib/admin-auth';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

export async function POST(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const response = NextResponse.json({ success: true });
  clearAdminAuthCookies(response);

  const reqInfo = extractRequestInfo(request);
  await logActivity({
    type: 'admin_action',
    ...reqInfo,
    statusCode: 200,
    details: {
      action: 'admin_logout',
    },
  });

  return response;
}
