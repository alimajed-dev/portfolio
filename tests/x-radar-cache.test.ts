import { mkdtemp, rm } from "node:fs/promises";
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

  it("persists and deduplicates seen post IDs", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "radar-seen-"));
    vi.stubEnv("X_RADAR_DATA_DIR", temporaryDirectory);
    const { readSeenPostIds, rememberSeenPostIds } = await import("@/lib/x-radar/cache");
    await rememberSeenPostIds(["one", "two"]);
    await rememberSeenPostIds(["two", "three"]);
    expect(Array.from(await readSeenPostIds())).toEqual(["one", "two", "three"]);
  });
});
