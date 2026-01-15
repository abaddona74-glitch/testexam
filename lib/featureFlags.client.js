export function getTestUploadModeClient() {
  const raw = process.env.NEXT_PUBLIC_TEST_UPLOAD_MODE ?? 'off';
  const normalized = String(raw).trim().toLowerCase();

  if (normalized === 'community') return 'community';
  return 'off';
}
