/**
 * In-memory run caps. No database by design (see CLAUDE.md) — the counts reset
 * whenever the server restarts, which is fine for protecting free-tier model
 * quotas on a single long-lived Railway process.
 *
 * DEPLOYMENT CONSTRAINT: this only holds if the service runs as exactly one
 * instance. Scaling horizontally splits the counters per replica and multiplies
 * the effective caps by the replica count.
 */

const RUNS_PER_DAY = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Guard against one visitor holding several streams open at once. */
const MAX_CONCURRENT_PER_IP = 1;

/**
 * Ceilings across every visitor. Per-IP keys are only as trustworthy as the
 * proxy chain (see `clientIp`), so these bound total provider spend even if
 * someone is rotating forged addresses.
 */
const GLOBAL_RUNS_PER_DAY = 200;
const MAX_CONCURRENT_GLOBAL = 6;

export const LIMITS = {
  RUNS_PER_DAY,
  MAX_CONCURRENT_PER_IP,
  GLOBAL_RUNS_PER_DAY,
  MAX_CONCURRENT_GLOBAL,
  WINDOW_MS,
} as const;

type Entry = { count: number; resetAt: number; active: number };

const buckets = new Map<string, Entry>();

let globalCount = 0;
let globalActive = 0;
let globalResetAt = 0;

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
  | {
      ok: true;
      remaining: number;
      /** Idempotent — safe to call on success, error, timeout and client abort. */
      release: () => void;
    }
  | { ok: false; reason: string; retryAfterSeconds: number };

const secondsUntil = (deadline: number, now: number) =>
  Math.max(1, Math.ceil((deadline - now) / 1000));

/**
 * Reserves one run. On success the caller MUST call the returned `release` when
 * the stream ends, whichever way it ends. Handing back a bound release instead
 * of exporting `releaseRun(ip)` makes double-release and wrong-key release
 * impossible at the type level rather than by convention at each call site.
 */
export function reserveRun(ip: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  if (globalResetAt <= now) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }

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
      retryAfterSeconds: secondsUntil(entry.resetAt, now),
    };
  }
  if (globalActive >= MAX_CONCURRENT_GLOBAL) {
    return {
      ok: false,
      reason: "The demo is busy right now — a few runs are already in flight. Try again in a moment.",
      retryAfterSeconds: 30,
    };
  }
  if (globalCount >= GLOBAL_RUNS_PER_DAY) {
    return {
      ok: false,
      reason:
        "The demo has hit its daily capacity across all visitors — it runs on free model tiers. Try again tomorrow.",
      retryAfterSeconds: secondsUntil(globalResetAt, now),
    };
  }

  entry.count += 1;
  entry.active += 1;
  globalCount += 1;
  globalActive += 1;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    // Decrement the entry this reservation incremented. If the window rolled
    // over and `getEntry` has since replaced it, that object is an orphan and
    // decrementing it is a no-op on live state, which is the correct outcome.
    if (entry.active > 0) entry.active -= 1;
    if (globalActive > 0) globalActive -= 1;
  };

  return { ok: true, remaining: RUNS_PER_DAY - entry.count, release };
}

/**
 * Proxy hops between the public internet and this process.
 *
 * Railway's edge proxy is one hop and *appends* the real client address to any
 * inbound `X-Forwarded-For`, so the rightmost entry is the only one the proxy
 * itself wrote and the only one a visitor cannot forge — everything to its left
 * is visitor-supplied. Reading the leftmost entry (the common mistake) hands the
 * quota key straight to the caller. Raise this only if another trusted proxy or
 * CDN is put in front of Railway.
 */
const TRUSTED_PROXY_HOPS = (() => {
  const parsed = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
})();

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Reduces the many spellings of one address to a single bucket key, so a caller
 * cannot multiply its quota just by varying the representation. Returns null for
 * anything that is not recognisably an address.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  let value = raw?.trim().toLowerCase();
  if (!value) return null;

  // `[::1]:443` / `[::1]`
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) value = bracketed[1];
  // `1.2.3.4:5678` — a lone colon can't be IPv6, so it's a port suffix.
  else if (value.split(":").length === 2) value = value.split(":")[0];

  // IPv4-mapped IPv6 is the same host as its IPv4 form.
  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) value = mapped[1];

  const v4 = value.match(IPV4);
  if (v4) {
    return v4.slice(1).every((octet) => Number(octet) <= 255) ? value : null;
  }
  if (value.includes(":") && /^[0-9a-f:.]+$/.test(value)) return value;
  return null;
}

/**
 * Best-effort client IP, read from the hop this deployment actually trusts.
 * Falls back to a shared `"unknown"` bucket rather than to an attacker-supplied
 * value — a shared bucket is rate limited too strictly, never too loosely.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const candidate = chain[chain.length - TRUSTED_PROXY_HOPS];
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }
  return normalizeIp(headers.get("x-real-ip")) ?? "unknown";
}
