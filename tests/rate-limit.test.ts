import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RateLimitModule = typeof import("@/lib/rate-limit");

/**
 * The limiter's state lives at module scope, so every test gets a freshly
 * evaluated copy instead of a shared one. This also lets `TRUSTED_PROXY_HOPS`,
 * which is read once at import time, be varied per test.
 */
async function freshModule(env: Record<string, string> = {}): Promise<RateLimitModule> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("@/lib/rate-limit");
}

const headers = (init: Record<string, string>) => new Headers(init);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("clientIp", () => {
  it("reads the rightmost X-Forwarded-For entry, which is the one the trusted proxy appended", async () => {
    const { clientIp } = await freshModule();
    // A visitor prepending a forged address must not change the key: Railway's
    // edge proxy appends the real address to whatever arrived.
    expect(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("cannot be shifted by stuffing extra hops into the chain", async () => {
    const { clientIp } = await freshModule();
    const forged = "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 203.0.113.7";
    expect(clientIp(headers({ "x-forwarded-for": forged }))).toBe("203.0.113.7");
  });

  it("honours TRUSTED_PROXY_HOPS when another proxy sits in front", async () => {
    const { clientIp } = await freshModule({ TRUSTED_PROXY_HOPS: "2" });
    expect(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  it("ignores a non-numeric or out-of-range TRUSTED_PROXY_HOPS and falls back to one hop", async () => {
    for (const value of ["nonsense", "0", "-3"]) {
      const { clientIp } = await freshModule({ TRUSTED_PROXY_HOPS: value });
      expect(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 203.0.113.7" })), value).toBe(
        "203.0.113.7",
      );
      vi.unstubAllEnvs();
    }
  });

  it("falls back to x-real-ip, then to a shared bucket", async () => {
    const { clientIp } = await freshModule();
    expect(clientIp(headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(headers({}))).toBe("unknown");
    // Junk in the trusted position must never become the key.
    expect(clientIp(headers({ "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
    expect(clientIp(headers({ "x-forwarded-for": "  ,  " }))).toBe("unknown");
  });

  it("collapses different spellings of one address into a single bucket", async () => {
    const { clientIp } = await freshModule();
    const spellings = ["203.0.113.7", "203.0.113.7:44321", "::ffff:203.0.113.7"];
    for (const spelling of spellings) {
      expect(clientIp(headers({ "x-forwarded-for": spelling })), spelling).toBe("203.0.113.7");
    }
    expect(clientIp(headers({ "x-forwarded-for": "[2001:DB8::1]:443" }))).toBe("2001:db8::1");
  });

  it("rejects malformed IPv4 rather than accepting it as a key", async () => {
    const { normalizeIp } = await freshModule();
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("1.2.3")).toBeNull();
    expect(normalizeIp("")).toBeNull();
    expect(normalizeIp(null)).toBeNull();
  });
});

describe("reserveRun", () => {
  let mod: RateLimitModule;

  beforeEach(async () => {
    mod = await freshModule();
  });

  const reserveAndRelease = (ip: string) => {
    const result = mod.reserveRun(ip);
    if (result.ok) result.release();
    return result;
  };

  it("allows the daily quota and rejects the run after it", () => {
    for (let i = 0; i < mod.LIMITS.RUNS_PER_DAY; i += 1) {
      const result = reserveAndRelease("1.1.1.1");
      expect(result.ok, `run ${i + 1}`).toBe(true);
      if (result.ok) expect(result.remaining).toBe(mod.LIMITS.RUNS_PER_DAY - (i + 1));
    }

    const denied = reserveAndRelease("1.1.1.1");
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.reason).toMatch(/daily demo limit/i);
      expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("keys quota per IP", () => {
    for (let i = 0; i < mod.LIMITS.RUNS_PER_DAY; i += 1) reserveAndRelease("1.1.1.1");
    expect(reserveAndRelease("2.2.2.2").ok).toBe(true);
  });

  it("allows only one concurrent run per IP", () => {
    const first = mod.reserveRun("1.1.1.1");
    expect(first.ok).toBe(true);

    const second = mod.reserveRun("1.1.1.1");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toMatch(/one run at a time/i);

    if (first.ok) first.release();
    expect(mod.reserveRun("1.1.1.1").ok).toBe(true);
  });

  it("does not refund quota on release — only the concurrency slot", () => {
    for (let i = 0; i < mod.LIMITS.RUNS_PER_DAY; i += 1) reserveAndRelease("1.1.1.1");
    expect(mod.reserveRun("1.1.1.1").ok).toBe(false);
  });

  it("is idempotent on release, so a double release cannot inflate capacity", () => {
    const first = mod.reserveRun("1.1.1.1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    first.release();
    first.release();
    first.release();

    // Exactly one concurrency slot came back: a second run starts, a third does not.
    const second = mod.reserveRun("1.1.1.1");
    expect(second.ok).toBe(true);
    expect(mod.reserveRun("1.1.1.1").ok).toBe(false);
    if (second.ok) second.release();
  });

  it("caps concurrent runs across all visitors, even from distinct IPs", () => {
    const held = [];
    for (let i = 0; i < mod.LIMITS.MAX_CONCURRENT_GLOBAL; i += 1) {
      const result = mod.reserveRun(`10.0.0.${i}`);
      expect(result.ok, `global slot ${i + 1}`).toBe(true);
      if (result.ok) held.push(result);
    }

    const denied = mod.reserveRun("10.0.1.1");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toMatch(/busy right now/i);

    held[0].release();
    expect(mod.reserveRun("10.0.1.1").ok).toBe(true);
  });

  // This is the ceiling that survives forged per-IP keys: rotating addresses
  // still cannot spend more than the whole-site daily budget.
  it("caps total daily runs across all visitors", () => {
    let allowed = 0;
    for (let i = 0; i < mod.LIMITS.GLOBAL_RUNS_PER_DAY + 20; i += 1) {
      // A fresh IP every few runs, so the per-IP cap is never what stops us.
      const result = reserveAndRelease(`10.${Math.floor(i / 4)}.${i % 4}.1`);
      if (result.ok) allowed += 1;
    }
    expect(allowed).toBe(mod.LIMITS.GLOBAL_RUNS_PER_DAY);

    const denied = mod.reserveRun("10.99.99.99");
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toMatch(/daily capacity/i);
  });

  it("reopens both the per-IP and global budgets once the window rolls over", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    for (let i = 0; i < mod.LIMITS.RUNS_PER_DAY; i += 1) reserveAndRelease("1.1.1.1");
    expect(mod.reserveRun("1.1.1.1").ok).toBe(false);

    vi.setSystemTime(new Date("2026-01-02T00:00:01Z"));
    const afterReset = mod.reserveRun("1.1.1.1");
    expect(afterReset.ok).toBe(true);
    if (afterReset.ok) expect(afterReset.remaining).toBe(mod.LIMITS.RUNS_PER_DAY - 1);
  });
});
