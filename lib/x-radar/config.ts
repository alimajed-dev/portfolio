function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function refreshIntervalHours() {
  return boundedInteger(process.env.X_REFRESH_INTERVAL_HOURS, 240, 1, 24 * 24);
}

export function contentMaxAgeHours() {
  return boundedInteger(process.env.X_CONTENT_MAX_AGE_HOURS, 12, 1, 24);
}

export function maxPostsPerScan() {
  return boundedInteger(process.env.X_MAX_POSTS_PER_SCAN, 30, 10, 100);
}

export function lookbackHours() {
  return boundedInteger(process.env.X_LOOKBACK_HOURS, 24, 12, 168);
}

export function monthlyRequestLimit() {
  return boundedInteger(process.env.X_MONTHLY_REQUEST_LIMIT, 14, 1, 200);
}

export function manualMonthlyRequestLimit() {
  return boundedInteger(process.env.X_MANUAL_MONTHLY_REQUEST_LIMIT, 10, 1, 100);
}
