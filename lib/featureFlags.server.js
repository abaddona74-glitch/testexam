export function getTestUploadMode() {
  const raw = process.env.TEST_UPLOAD_MODE ?? process.env.NEXT_PUBLIC_TEST_UPLOAD_MODE ?? 'off';
  const normalized = String(raw).trim().toLowerCase();

  if (normalized === 'community') return 'community';
  return 'off';
}

export function isTestUploadEnabled() {
  return getTestUploadMode() !== 'off';
}

export function isGodmodeUploadEnabled() {
  const raw = process.env.ALLOW_GODMODE_UPLOAD ?? '0';
  const normalized = String(raw).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}
