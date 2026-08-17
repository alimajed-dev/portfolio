import { describe, expect, it } from "vitest";
import { metricSignals, opportunityScore, scoreLabel } from "@/lib/x-radar/scoring";

const now = new Date("2026-08-17T12:00:00Z");
const analysis = { relevance: 90, abilityToAddValue: 90, audienceValue: 75, whyReply: "Why", suggestedAngle: "Angle" };

describe("Conversation Opportunity Radar scoring", () => {
  it("rewards active, fresh conversations", () => {
    const active = opportunityScore(analysis, { likes: 200, replies: 60, reposts: 25, quotes: 12, impressions: 30000 }, "2026-08-17T11:00:00Z", now);
    const quiet = opportunityScore(analysis, { likes: 2, replies: 0, reposts: 0, quotes: 0, impressions: 80 }, "2026-08-17T11:00:00Z", now);
    expect(active.score).toBeGreaterThan(quiet.score);
    expect(active.signals.velocity).toBeGreaterThan(quiet.signals.velocity);
  });

  it("makes an older post less timely than an equally engaged new post", () => {
    const metrics = { likes: 100, replies: 25, reposts: 12, quotes: 4 };
    expect(metricSignals(metrics, "2026-08-17T11:30:00Z", now).freshness).toBeGreaterThan(metricSignals(metrics, "2026-08-15T12:00:00Z", now).freshness);
  });

  it("requires more than relevance alone for a top score", () => {
    const result = opportunityScore({ ...analysis, relevance: 100 }, { likes: 0, replies: 0, reposts: 0, quotes: 0 }, "2026-08-15T12:00:00Z", now);
    expect(result.score).toBeLessThan(70);
  });

  it("does not let viral reach overcome poor relevance", () => {
    const result = opportunityScore({ ...analysis, relevance: 20, abilityToAddValue: 15, audienceValue: 20 }, { likes: 10000, replies: 1500, reposts: 3000, quotes: 500, impressions: 2_000_000 }, "2026-08-17T11:30:00Z", now);
    expect(result.score).toBeLessThan(60);
  });

  it("maps scores to clear check, maybe, and skip guidance", () => {
    expect(scoreLabel(70)).toBe("Check");
    expect(scoreLabel(69)).toBe("Maybe");
    expect(scoreLabel(55)).toBe("Maybe");
    expect(scoreLabel(54)).toBe("Skip");
  });
});
