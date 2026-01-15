export function getTestUploadMode() {
  const raw = process.env.TEST_UPLOAD_MODE ?? process.env.NEXT_PUBLIC_TEST_UPLOAD_MODE ?? 'off';
  const normalized = String(raw).trim().toLowerCase();

  if (normalized === 'community') return 'community';
  return 'off';
}

export function isTestUploadEnabled() {
  return getTestUploadMode() !== 'off';
}
