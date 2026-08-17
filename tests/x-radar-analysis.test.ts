import { describe, expect, it } from "vitest";
import { analyzeLocally } from "@/lib/x-radar/analysis";
import type { XPost } from "@/lib/x-radar/types";

function post(text: string): XPost {
  return {
    id: "1", text, createdAt: "2026-08-17T12:00:00Z",
    author: { id: "u1", name: "Engineer", username: "engineer", description: "Software engineering" },
    metrics: { likes: 0, replies: 0, reposts: 0, quotes: 0 },
  };
}

describe("local radar analysis", () => {
  it("keeps substantive declarative engineering observations eligible", () => {
    const result = analyzeLocally(post("We use architecture decision records as context for coding agents."));
    expect(result.relevance).toBeGreaterThanOrEqual(50);
    expect(result.abilityToAddValue).toBeGreaterThanOrEqual(45);
  });

  it("penalizes promotional engagement bait", () => {
    const result = analyzeLocally(post("Launching our AI giveaway — check it out, follow me and like if you agree!"));
    expect(result.abilityToAddValue).toBeLessThan(45);
  });
});
