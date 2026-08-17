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

import { refreshRadar } from "@/lib/x-radar/service";
import type { XPost } from "@/lib/x-radar/types";

const candidate: XPost = {
  id: "same-post",
  text: "A concrete AI engineering trade-off",
  createdAt: "2026-08-18T00:00:00Z",
  author: { id: "author", name: "Engineer", username: "engineer", followers: 10_000, postsPerMonth: 100, verified: true },
  metrics: { likes: 100, replies: 20, reposts: 10, quotes: 5, impressions: 10_000 },
};
const relevance = { relevance: 90, abilityToAddValue: 85, audienceValue: 70, whyReply: "Useful", suggestedAngle: "Add context" };

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

afterEach(() => vi.restoreAllMocks());

describe("Radar scan lifecycle", () => {
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
