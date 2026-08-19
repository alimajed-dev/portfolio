import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let temporaryDirectory: string | undefined;

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

describe("radar request budget", () => {
  it("caps manual scans independently while retaining the overall request cap", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-budget-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    vi.stubEnv("X_MANUAL_MONTHLY_REQUEST_LIMIT", "2");
    vi.stubEnv("X_MONTHLY_REQUEST_LIMIT", "5");
    const { getRadarUsage, reserveMonthlyRequest } = await import("@/lib/x-radar/cache");

    expect((await reserveMonthlyRequest("manual")).ok).toBe(true);
    expect((await reserveMonthlyRequest("manual")).ok).toBe(true);
    expect(await reserveMonthlyRequest("manual")).toEqual({ ok: false, reason: "manual" });
    expect((await reserveMonthlyRequest("scheduled")).ok).toBe(true);
    expect(await getRadarUsage()).toMatchObject({ manualRemaining: 0, manualLimit: 2 });
  });

  it("allows up to 100 owner-configured manual scans", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-budget-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    vi.stubEnv("X_MANUAL_MONTHLY_REQUEST_LIMIT", "150");
    vi.stubEnv("X_MONTHLY_REQUEST_LIMIT", "200");
    const { getRadarUsage } = await import("@/lib/x-radar/cache");

    expect(await getRadarUsage()).toMatchObject({ manualRemaining: 100, manualLimit: 100 });
  });

  it("removes the legacy seen-post cache", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-seen-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    const seenPath = path.join(temporaryDirectory, "x-radar-seen.json");
    await writeFile(seenPath, JSON.stringify({ entries: [{ id: "one", seenAt: new Date().toISOString() }] }));
    const { clearLegacySeenPostCache } = await import("@/lib/x-radar/cache");
    await clearLegacySeenPostCache();
    await expect(readFile(seenPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(clearLegacySeenPostCache()).resolves.toBeUndefined();
  });

  it("purges a requested post and retains only a one-way removal hash", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-removal-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    const { blockRadarPost, blockedRadarPostIds, radarPostRemovalKey, readSnapshot, writeSnapshot } = await import("@/lib/x-radar/cache");
    await writeSnapshot({
      posts: [{ id: "123" } as never], lastRefreshedAt: new Date().toISOString(), source: "x",
      stats: { scanned: 1, rejected: 0, opportunities: 1 },
    });

    await blockRadarPost("123");
    expect((await readSnapshot())?.posts).toEqual([]);
    expect(await blockedRadarPostIds()).toEqual(new Set([radarPostRemovalKey("123")]));
    expect(await readFile(path.join(temporaryDirectory, "x-radar-removals.json"), "utf8")).not.toContain("123");
  });

  it("stores the cadence anchor separately from X Content", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-schedule-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    const { deleteSnapshot, readLastSuccessfulScanAt, writeLastSuccessfulScanAt, writeSnapshot } = await import("@/lib/x-radar/cache");
    const timestamp = "2026-08-19T09:00:00.000Z";
    await writeSnapshot({ posts: [], lastRefreshedAt: timestamp, source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 } });
    await writeLastSuccessfulScanAt(timestamp);
    await deleteSnapshot();
    await expect(readLastSuccessfulScanAt()).resolves.toBe(timestamp);
  });

  it("can purge every stored X-content artifact after access termination", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-purge-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    const { blockRadarPost, purgeAllRadarContent, writeLastSuccessfulScanAt, writeSnapshot } = await import("@/lib/x-radar/cache");
    await writeSnapshot({ posts: [], lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 } });
    await writeLastSuccessfulScanAt(new Date().toISOString());
    await blockRadarPost("123");
    await purgeAllRadarContent();
    await expect(readFile(path.join(temporaryDirectory, "x-radar.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(path.join(temporaryDirectory, "x-radar-removals.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(path.join(temporaryDirectory, "x-radar-schedule.json"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
