import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({
  clearLegacySeenPostCache: vi.fn(),
  readSnapshot: vi.fn(),
  reserveMonthlyRequest: vi.fn(),
  writeSnapshot: vi.fn(),
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
  id: "same-post",
  text: "A concrete AI engineering trade-off",
  createdAt: "2026-08-18T00:00:00Z",
  author: { id: "author", name: "Engineer", username: "engineer", followers: 10_000, postsPerMonth: 100, verified: true },
  metrics: { likes: 100, replies: 20, reposts: 10, quotes: 5, impressions: 10_000 },
};
const relevance = { relevance: 90, abilityToAddValue: 85, audienceValue: 70, whyReply: "Useful", suggestedAngle: "Add context" };
const rankedCandidate: RankedPost = {
  ...candidate,
  opportunityScore: 80,
  label: "Check",
  signals: { ...relevance, engagement: 75, reach: 70, velocity: 65 },
  whyReply: relevance.whyReply,
  suggestedAngle: relevance.suggestedAngle,
  url: `https://x.com/${candidate.author.username}/status/${candidate.id}`,
};

beforeEach(() => {
  cache.clearLegacySeenPostCache.mockReset().mockResolvedValue(undefined);
  cache.readSnapshot.mockReset().mockResolvedValue({ posts: [{ id: candidate.id }], lastRefreshedAt: "2026-08-17T12:00:00Z" });
  cache.reserveMonthlyRequest.mockReset().mockResolvedValue({ ok: true, manualRemaining: 49 });
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
  it("accepts a 240-hour cadence while bounding unsafe timer values", () => {
    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", "240");
    expect(refreshIntervalHours()).toBe(240);

    vi.stubEnv("X_REFRESH_INTERVAL_HOURS", "1000");
    expect(refreshIntervalHours()).toBe(576);
  });

  it("keeps a ten-day snapshot when retention is configured independently", async () => {
    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", "264");
    cache.readSnapshot.mockResolvedValue({
      posts: [rankedCandidate],
      lastRefreshedAt: new Date(Date.now() - 240 * 3_600_000).toISOString(),
      source: "x",
      stats: { scanned: 1, rejected: 0, opportunities: 1 },
    });

    expect(contentMaxAgeHours()).toBe(264);
    expect((await getSnapshot())?.posts).toHaveLength(1);

    vi.stubEnv("X_CONTENT_MAX_AGE_HOURS", "1000");
    expect(contentMaxAgeHours()).toBe(720);
  });

  it.each(["manual", "scheduled"] as const)("ranks every post in the same 12-hour result set for a %s scan", async (kind) => {
    const snapshot = await refreshRadar(undefined, kind);

    expect(client.searchRecentPosts).toHaveBeenCalledOnce();
    expect(analysis.analyzePosts).toHaveBeenCalledWith([candidate], undefined);
    expect(snapshot.posts).toHaveLength(1);
    expect(snapshot.posts[0].id).toBe(candidate.id);
    expect(monitoring.captureRadarScan).toHaveBeenCalledWith(expect.objectContaining({ kind, returnedCount: 1, displayedCount: 1 }));
  });

  it("records a successful but empty X result separately from a failure", async () => {
    client.searchRecentPosts.mockResolvedValue([]);
    analysis.analyzePosts.mockResolvedValue([]);

    const snapshot = await refreshRadar(undefined, "manual");

    expect(snapshot.posts).toEqual([]);
    expect(snapshot.warning).toMatch(/previous 12 hours/i);
    expect(monitoring.captureRadarScan).toHaveBeenCalledWith(expect.objectContaining({ returnedCount: 0, displayedCount: 0 }));
    expect(monitoring.captureOperationalError).not.toHaveBeenCalled();
  });
});
