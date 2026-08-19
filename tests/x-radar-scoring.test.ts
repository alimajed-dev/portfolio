import { describe, expect, it } from "vitest";
import { metricSignals, OPPORTUNITY_WEIGHTS, opportunityScore, scoreLabel } from "@/lib/x-radar/scoring";

const now = new Date("2026-08-19T12:00:00Z");
const analysis = { personalFit: 92, conversationOpening: 94, brevity: 100, whyReply: "Clear opening", suggestedAngle: "Add context" };

describe("personalized Conversation Opportunity Radar scoring", () => {
  it("keeps the documented score complete", () => {
    expect(Object.values(OPPORTUNITY_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBeCloseTo(1);
    expect(OPPORTUNITY_WEIGHTS).toEqual({ personalFit: 0.22, conversationOpening: 0.22, momentum: 0.22, replyDensity: 0.14, brevity: 0.12, reach: 0.08 });
  });

  it("rewards real reply momentum", () => {
    const active = opportunityScore(analysis, { likes: 300, replies: 90, reposts: 20, quotes: 4, impressions: 20_000 }, "2026-08-19T06:00:00Z", now);
    const quiet = opportunityScore(analysis, { likes: 30, replies: 3, reposts: 1, quotes: 0, impressions: 20_000 }, "2026-08-19T06:00:00Z", now);
    expect(active.score).toBeGreaterThan(quiet.score);
    expect(active.signals.momentum).toBeGreaterThan(quiet.signals.momentum);
  });

  it("rewards reply density instead of passive reach", () => {
    const conversational = metricSignals({ likes: 40, replies: 20, reposts: 1, quotes: 0, impressions: 1_000 }, "2026-08-19T08:00:00Z", now);
    const broadcast = metricSignals({ likes: 400, replies: 4, reposts: 20, quotes: 1, impressions: 100_000 }, "2026-08-19T08:00:00Z", now);
    expect(conversational.replyDensity).toBeGreaterThan(broadcast.replyDensity);
  });

  it("uses age to measure momentum", () => {
    const metrics = { likes: 100, replies: 25, reposts: 4, quotes: 1 };
    expect(metricSignals(metrics, "2026-08-19T11:00:00Z", now).momentum).toBeGreaterThan(metricSignals(metrics, "2026-08-18T12:00:00Z", now).momentum);
  });

  it("makes brevity materially affect otherwise equal candidates", () => {
    const metrics = { likes: 100, replies: 25, reposts: 4, quotes: 1, impressions: 5_000 };
    const concise = opportunityScore({ ...analysis, brevity: 100 }, metrics, "2026-08-19T08:00:00Z", now);
    const long = opportunityScore({ ...analysis, brevity: 10 }, metrics, "2026-08-19T08:00:00Z", now);
    expect(concise.score - long.score).toBeGreaterThanOrEqual(10);
  });

  it("does not let views rescue a weak conversational opening", () => {
    const result = opportunityScore({ ...analysis, conversationOpening: 20 }, { likes: 10_000, replies: 500, reposts: 2_000, quotes: 100, impressions: 2_000_000 }, "2026-08-19T11:00:00Z", now);
    expect(result.score).toBeLessThan(55);
  });

  it("requires at least three replies", () => {
    const result = opportunityScore(analysis, { likes: 1_000, replies: 2, reposts: 50, quotes: 10, impressions: 100_000 }, "2026-08-19T11:00:00Z", now);
    expect(result.score).toBeLessThan(55);
  });

  it("maps scores to check, maybe, and skip guidance", () => {
    expect(scoreLabel(70)).toBe("Check");
    expect(scoreLabel(69)).toBe("Maybe");
    expect(scoreLabel(55)).toBe("Maybe");
    expect(scoreLabel(54)).toBe("Skip");
  });
});
