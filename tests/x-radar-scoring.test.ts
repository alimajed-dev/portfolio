import { describe, expect, it } from "vitest";
import { metricSignals, OPPORTUNITY_WEIGHTS, opportunityScore, scoreLabel } from "@/lib/x-radar/scoring";

const now = new Date("2026-08-17T12:00:00Z");
const analysis = { relevance: 90, abilityToAddValue: 90, audienceValue: 75, whyReply: "Why", suggestedAngle: "Angle" };

describe("Conversation Opportunity Radar scoring", () => {
  it("rewards actively interacting conversations", () => {
    const active = opportunityScore(analysis, { likes: 200, replies: 60, reposts: 25, quotes: 12, impressions: 30000 }, "2026-08-17T11:00:00Z", now);
    const quiet = opportunityScore(analysis, { likes: 2, replies: 0, reposts: 0, quotes: 0, impressions: 80 }, "2026-08-17T11:00:00Z", now);
    expect(active.score).toBeGreaterThan(quiet.score);
    expect(active.signals.velocity).toBeGreaterThan(quiet.signals.velocity);
  });

  it("uses age only to measure interaction velocity", () => {
    const metrics = { likes: 100, replies: 25, reposts: 12, quotes: 4 };
    const recent = metricSignals(metrics, "2026-08-17T11:30:00Z", now);
    const older = metricSignals(metrics, "2026-08-17T01:00:00Z", now);
    expect(recent.velocity).toBeGreaterThan(older.velocity);
    expect(recent).not.toHaveProperty("freshness");
  });

  it("keeps the documented weights complete and excludes freshness", () => {
    expect(Object.values(OPPORTUNITY_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBeCloseTo(1);
    expect(OPPORTUNITY_WEIGHTS).not.toHaveProperty("freshness");
  });

  it("values conversational interactions more than lightweight reactions", () => {
    const createdAt = "2026-08-17T10:00:00Z";
    const replies = metricSignals({ likes: 0, replies: 10, reposts: 0, quotes: 0 }, createdAt, now).engagement;
    const quotes = metricSignals({ likes: 0, replies: 0, reposts: 0, quotes: 10 }, createdAt, now).engagement;
    const reposts = metricSignals({ likes: 0, replies: 0, reposts: 10, quotes: 0 }, createdAt, now).engagement;
    const likes = metricSignals({ likes: 10, replies: 0, reposts: 0, quotes: 0 }, createdAt, now).engagement;
    expect(replies).toBeGreaterThan(quotes);
    expect(quotes).toBeGreaterThan(reposts);
    expect(reposts).toBeGreaterThan(likes);
  });

  it("requires more than relevance alone for a top score", () => {
    const result = opportunityScore({ ...analysis, relevance: 100 }, { likes: 0, replies: 0, reposts: 0, quotes: 0 }, "2026-08-15T12:00:00Z", now);
    expect(result.score).toBeLessThan(70);
  });

  it("does not let viral reach overcome poor relevance", () => {
    const result = opportunityScore({ ...analysis, relevance: 20, abilityToAddValue: 15, audienceValue: 20 }, { likes: 10000, replies: 1500, reposts: 3000, quotes: 500, impressions: 2_000_000 }, "2026-08-17T11:30:00Z", now);
    expect(result.score).toBeLessThan(60);
  });

  it("keeps a brand-new post with almost no views or interactions in Skip", () => {
    const result = opportunityScore(analysis, { likes: 0, replies: 1, reposts: 0, quotes: 0, impressions: 1 }, "2026-08-17T11:58:00Z", now);
    expect(result.score).toBeLessThan(55);
  });

  it("makes interaction depth dominate otherwise equal posts", () => {
    const visible = opportunityScore(analysis, { likes: 120, replies: 30, reposts: 15, quotes: 8, impressions: 20_000 }, "2026-08-17T10:00:00Z", now);
    const unseen = opportunityScore(analysis, { likes: 1, replies: 0, reposts: 0, quotes: 0, impressions: 5 }, "2026-08-17T10:00:00Z", now);
    expect(visible.score - unseen.score).toBeGreaterThan(30);
  });

  it("prefers meaningful interaction over passive view reach", () => {
    const interactive = opportunityScore(analysis, { likes: 150, replies: 40, reposts: 20, quotes: 10, impressions: 1_000 }, "2026-08-17T10:00:00Z", now);
    const viewed = opportunityScore(analysis, { likes: 2, replies: 0, reposts: 0, quotes: 0, impressions: 1_000_000 }, "2026-08-17T10:00:00Z", now);
    expect(interactive.score).toBeGreaterThan(viewed.score);
  });

  it("gives authoritative authors a meaningful but non-dominant advantage", () => {
    const metrics = { likes: 120, replies: 30, reposts: 15, quotes: 8, impressions: 20_000 };
    const authoritative = opportunityScore({ ...analysis, audienceValue: 100 }, metrics, "2026-08-17T10:00:00Z", now);
    const unknown = opportunityScore({ ...analysis, audienceValue: 20 }, metrics, "2026-08-17T10:00:00Z", now);
    expect(authoritative.score).toBeGreaterThan(unknown.score);
    expect(authoritative.score - unknown.score).toBeLessThanOrEqual(10);
  });

  it("maps scores to clear check, maybe, and skip guidance", () => {
    expect(scoreLabel(70)).toBe("Check");
    expect(scoreLabel(69)).toBe("Maybe");
    expect(scoreLabel(55)).toBe("Maybe");
    expect(scoreLabel(54)).toBe("Skip");
  });
});
