/**
 * In-memory per-IP run cap. No database by design (see CLAUDE.md) — the counts
 * reset whenever the server restarts, which is fine for protecting free-tier
 * model quotas on a single long-lived Railway process.
 */

const RUNS_PER_DAY = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Guard against one visitor holding several streams open at once. */
const MAX_CONCURRENT_PER_IP = 1;

type Entry = { count: number; resetAt: number; active: number };

const buckets = new Map<string, Entry>();

function sweep(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now && entry.active === 0) buckets.delete(key);
  }
}

function getEntry(ip: string, now: number): Entry {
  let entry = buckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS, active: 0 };
    buckets.set(ip, entry);
  }
  return entry;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: string; retryAfterSeconds: number };

/** Reserves one run. Call `releaseRun` when the stream ends, either way. */
export function reserveRun(ip: string): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const entry = getEntry(ip, now);

  if (entry.active >= MAX_CONCURRENT_PER_IP) {
    return {
      ok: false,
      reason: "One run at a time, please — let the current one finish first.",
      retryAfterSeconds: 30,
    };
  }
  if (entry.count >= RUNS_PER_DAY) {
    return {
      ok: false,
      reason: `Daily demo limit reached (${RUNS_PER_DAY} runs). This demo runs on free model tiers — try again tomorrow.`,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  entry.active += 1;
  return { ok: true, remaining: RUNS_PER_DAY - entry.count };
}

export function releaseRun(ip: string) {
  const entry = buckets.get(ip);
  if (entry && entry.active > 0) entry.active -= 1;
}

/** Best-effort client IP. Railway sits behind a proxy, so trust the headers it sets. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
