import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({
  blockedRadarPostIds: vi.fn(), clearLegacySeenPostCache: vi.fn(), deleteSnapshot: vi.fn(), radarPostRemovalKey: vi.fn((id: string) => `hash:${id}`),
  readLastSuccessfulScanAt: vi.fn(), readSnapshot: vi.fn(), reserveMonthlyRequest: vi.fn(), writeLastSuccessfulScanAt: vi.fn(), writeSnapshot: vi.fn(),
}));
const client = vi.hoisted(() => ({ searchRecentPosts: vi.fn() }));
const analysis = vi.hoisted(() => ({ analyzePosts: vi.fn() }));
const monitoring = vi.hoisted(() => ({ captureOperationalError: vi.fn(), captureRadarScan: vi.fn() }));

vi.mock("@/lib/x-radar/cache", () => cache);
vi.mock("@/lib/x-radar/x-client", () => client);
vi.mock("@/lib/x-radar/analysis", () => analysis);
vi.mock("@/lib/monitoring", () => monitoring);

import { contentMaxAgeHours, getSnapshot, refreshIntervalHours, refreshRadar } from "@/lib/x-radar/service";
import type { RankedPost, XPost } from "@/lib/x-radar/types";

const candidate: XPost = {
  id: "123", text: "Should coding agents always require human review?", createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
  author: { id: "456", name: "Engineer", username: "engineer", profileImageUrl: "https://example.com/avatar.jpg" },
  metrics: { likes: 140, replies: 35, reposts: 10, quotes: 3, impressions: 8_000 },
};
const relevance = { personalFit: 94, conversationOpening: 96, brevity: 100, whyReply: "Useful", suggestedAngle: "Add context" };
const rankedCandidate: RankedPost = {
  ...candidate, opportunityScore: 88, label: "Check", exceptionalTrend: false,
  signals: { ...relevance, momentum: 90, replyDensity: 72, reach: 78 },
  whyReply: relevance.whyReply, suggestedAngle: relevance.suggestedAngle,
  url: `https://x.com/${candidate.author.username}/status/${candidate.id}`,
};

beforeEach(() => {
  vi.stubEnv("X_RADAR_USE_CASE_APPROVED", "true");
  cache.blockedRadarPostIds.mockReset().mockResolvedValue(new Set());
  cache.clearLegacySeenPostCache.mockReset().mockResolvedValue(undefined);
  cache.deleteSnapshot.mockReset().mockResolvedValue(undefined);
  cache.readLastSuccessfulScanAt.mockReset().mockResolvedValue(null);
  cache.readSnapshot.mockReset().mockResolvedValue(null);
  cache.reserveMonthlyRequest.mockReset().mockResolvedValue({ ok: true, manualRemaining: 49 });
  cache.writeLastSuccessfulScanAt.mockReset().mockResolvedValue(undefined);
  cache.writeSnapshot.mockReset().mockResolvedValue(undefined);
  client.searchRecentPosts.mockReset().mockResolvedValue([candidate]);
  analysis.analyzePosts.mockReset().mockResolvedValue([relevance]);
  monitoring.captureOperationalError.mockReset();
  monitoring.captureRadarScan.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Radar scan lifecycle", () => {
  it("keeps the owner-selected ten-day cadence while hard-capping content retention at 24 hours", () => {
    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", "240");
    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", "264");
    expect(refreshIntervalHours()).toBe(240);
    expect(contentMaxAgeHours()).toBe(24);
  });

  it("deletes expired and legacy snapshots instead of displaying them", async () => {
    cache.readSnapshot.mockResolvedValue({ ...rankedCandidate, posts: [rankedCandidate], lastRefreshedAt: new Date(Date.now() - 25 * 3_600_000).toISOString(), source: "x", stats: { scanned: 1, rejected: 0, opportunities: 1 } });
    expect(await getSnapshot()).toBeNull();
    expect(cache.deleteSnapshot).toHaveBeenCalledOnce();

    cache.deleteSnapshot.mockClear();
    cache.readSnapshot.mockResolvedValue({ posts: [{ ...rankedCandidate, exceptionalTrend: undefined }], lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: 1, rejected: 0, opportunities: 1 } });
    expect(await getSnapshot()).toBeNull();
    expect(cache.deleteSnapshot).toHaveBeenCalledOnce();
  });

  it("returns a fresh compliant snapshot unchanged", async () => {
    const snapshot = { posts: [rankedCandidate], lastRefreshedAt: new Date().toISOString(), source: "x" as const, stats: { scanned: 1, rejected: 0, opportunities: 1 } };
    cache.readSnapshot.mockResolvedValue(snapshot);
    await expect(getSnapshot()).resolves.toEqual(snapshot);
  });

  it.each(["manual", "scheduled"] as const)("stores only posts that clear every quality gate for a %s scan", async (kind) => {
    const quiet = { ...candidate, id: "789", metrics: { ...candidate.metrics, replies: 1 } };
    client.searchRecentPosts.mockResolvedValue([candidate, quiet]);
    analysis.analyzePosts.mockResolvedValue([relevance, relevance]);
    const snapshot = await refreshRadar(undefined, kind);
    expect(snapshot.posts).toHaveLength(1);
    expect(snapshot.posts[0].id).toBe(candidate.id);
    expect(snapshot.stats).toEqual({ scanned: 2, rejected: 1, opportunities: 1 });
    expect(cache.writeLastSuccessfulScanAt).toHaveBeenCalledWith(snapshot.lastRefreshedAt);
    expect(monitoring.captureRadarScan).toHaveBeenCalledWith(expect.objectContaining({ kind, returnedCount: 2, displayedCount: 1 }));
  });

  it("excludes one-way removal hashes before analysis", async () => {
    cache.blockedRadarPostIds.mockResolvedValue(new Set([`hash:${candidate.id}`]));
    const snapshot = await refreshRadar(undefined, "manual");
    expect(analysis.analyzePosts).toHaveBeenCalledWith([], undefined);
    expect(snapshot.posts).toEqual([]);
  });

  it("does not consume a scan allowance before use-case approval", async () => {
    vi.stubEnv("X_RADAR_USE_CASE_APPROVED", "false");
    await expect(refreshRadar(undefined, "manual")).rejects.toThrow(/must be approved/i);
    expect(cache.reserveMonthlyRequest).not.toHaveBeenCalled();
    expect(client.searchRecentPosts).not.toHaveBeenCalled();
  });

  it("never falls back to cached content when use-case approval is disabled", async () => {
    vi.stubEnv("X_RADAR_USE_CASE_APPROVED", "false");
    cache.readSnapshot.mockResolvedValue({ posts: [rankedCandidate], lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: 1, rejected: 0, opportunities: 1 } });
    await expect(refreshRadar(undefined, "scheduled")).rejects.toThrow(/must be approved/i);
    expect(cache.deleteSnapshot).toHaveBeenCalledOnce();
  });

  it("records a successful result set with no qualifying opportunities", async () => {
    client.searchRecentPosts.mockResolvedValue([]);
    analysis.analyzePosts.mockResolvedValue([]);
    const snapshot = await refreshRadar(undefined, "manual");
    expect(snapshot.posts).toEqual([]);
    expect(snapshot.warning).toMatch(/quality gates/i);
    expect(monitoring.captureRadarScan).toHaveBeenCalledWith(expect.objectContaining({ returnedCount: 0, displayedCount: 0 }));
    expect(monitoring.captureOperationalError).not.toHaveBeenCalled();
  });
});
