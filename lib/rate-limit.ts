import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Daily usage survives deployments on the Railway volume. Active concurrency
 * slots remain in memory because they represent work owned by this process.
 * Exactly one replica is still required: an attached volume is not a
 * distributed lock or atomic multi-process rate-limit store.
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

type Entry = { active: number; resetAt: number };
type PersistedEntry = { count: number; resetAt: number };
type PersistedUsage = {
  entries: Record<string, PersistedEntry>;
  global: PersistedEntry;
};

const buckets = new Map<string, Entry>();
let globalActive = 0;
const dataDirectory = process.env.RATE_LIMIT_DATA_DIR || process.env.X_RADAR_DATA_DIR || path.join(process.cwd(), ".data");
const usagePath = path.join(dataDirectory, "agent-rate-limits.json");

function hashingSecret() {
  const source = process.env.RATE_LIMIT_HASH_SECRET || process.env.X_RADAR_ADMIN_TOKEN;
  if (!source || source.length < 32) return null;
  return createHash("sha256").update("agent-rate-limit\0").update(source).digest();
}

function quotaKey(ip: string) {
  const secret = hashingSecret();
  // A stable keyed hash is required for persistence without retaining the IP.
  // If it is not configured, use one shared fail-closed bucket rather than
  // writing a raw or reversibly hashed address to disk.
  return secret ? createHmac("sha256", secret).update(ip).digest("hex") : "unconfigured-shared-bucket";
}

function emptyUsage(now: number): PersistedUsage {
  return { entries: {}, global: { count: 0, resetAt: now + WINDOW_MS } };
}

function readUsage(now: number): PersistedUsage {
  try {
    const parsed = JSON.parse(readFileSync(usagePath, "utf8")) as Partial<PersistedUsage>;
    if (!parsed.entries || !parsed.global || typeof parsed.global.count !== "number" || typeof parsed.global.resetAt !== "number") return emptyUsage(now);
    return { entries: parsed.entries, global: parsed.global };
  } catch {
    return emptyUsage(now);
  }
}

function writeUsage(usage: PersistedUsage) {
  mkdirSync(dataDirectory, { recursive: true });
  const temporary = `${usagePath}.tmp`;
  writeFileSync(temporary, JSON.stringify(usage));
  renameSync(temporary, usagePath);
}

function sweep(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now && entry.active === 0) buckets.delete(key);
  }
}

function getActiveEntry(key: string, resetAt: number): Entry {
  let entry = buckets.get(key);
  if (!entry || (entry.resetAt <= Date.now() && entry.active === 0)) {
    entry = { active: 0, resetAt };
    buckets.set(key, entry);
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
  const key = quotaKey(ip);
  const usage = readUsage(now);
  if (usage.global.resetAt <= now) usage.global = { count: 0, resetAt: now + WINDOW_MS };
  for (const [storedKey, stored] of Object.entries(usage.entries)) {
    if (stored.resetAt <= now) delete usage.entries[storedKey];
  }
  const persistedEntry = usage.entries[key] ?? { count: 0, resetAt: now + WINDOW_MS };
  const activeEntry = getActiveEntry(key, persistedEntry.resetAt);

  if (activeEntry.active >= MAX_CONCURRENT_PER_IP) {
    return {
      ok: false,
      reason: "One run at a time, please — let the current one finish first.",
      retryAfterSeconds: 30,
    };
  }
  if (persistedEntry.count >= RUNS_PER_DAY) {
    return {
      ok: false,
      reason: `Daily demo limit reached (${RUNS_PER_DAY} runs). This demo runs on free model tiers — try again tomorrow.`,
      retryAfterSeconds: secondsUntil(persistedEntry.resetAt, now),
    };
  }
  if (globalActive >= MAX_CONCURRENT_GLOBAL) {
    return {
      ok: false,
      reason: "The demo is busy right now — a few runs are already in flight. Try again in a moment.",
      retryAfterSeconds: 30,
    };
  }
  if (usage.global.count >= GLOBAL_RUNS_PER_DAY) {
    return {
      ok: false,
      reason:
        "The demo has hit its daily capacity across all visitors — it runs on free model tiers. Try again tomorrow.",
      retryAfterSeconds: secondsUntil(usage.global.resetAt, now),
    };
  }

  persistedEntry.count += 1;
  usage.entries[key] = persistedEntry;
  usage.global.count += 1;
  writeUsage(usage);
  activeEntry.active += 1;
  globalActive += 1;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    if (activeEntry.active > 0) activeEntry.active -= 1;
    if (globalActive > 0) globalActive -= 1;
  };

  return { ok: true, remaining: RUNS_PER_DAY - persistedEntry.count, release };
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
