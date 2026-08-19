import { describe, expect, it } from "vitest";
import { analyzeLocally, analyzePosts } from "@/lib/x-radar/analysis";
import type { XPost } from "@/lib/x-radar/types";

function post(text: string, format: XPost["format"] = "standard"): XPost {
  return {
    id: "1", text, createdAt: "2026-08-19T08:00:00Z", format,
    author: { id: "u1", name: "Builder", username: "builder", profileImageUrl: "https://example.com/avatar.jpg" },
    metrics: { likes: 40, replies: 8, reposts: 2, quotes: 0, impressions: 2_000 },
  };
}

describe("local personalized radar analysis", () => {
  it("strongly recognizes concise, debatable AI positions", () => {
    const result = analyzeLocally(post("Hot take: junior developers should learn AI with strict review guardrails."));
    expect(result.personalFit).toBeGreaterThanOrEqual(88);
    expect(result.conversationOpening).toBeGreaterThanOrEqual(90);
    expect(result.brevity).toBe(100);
    expect(result.whyReply).toContain("debatable position");
  });

  it("recognizes direct SaaS and builder questions", () => {
    const result = analyzeLocally(post("What is one mistake you would never repeat while building a SaaS?"));
    expect(result.personalFit).toBeGreaterThanOrEqual(75);
    expect(result.conversationOpening).toBeGreaterThanOrEqual(70);
    expect(result.suggestedAngle).toContain("product-delivery");
  });

  it("recognizes concrete AI tool-switching decisions", () => {
    const result = analyzeLocally(post("I am cancelling one coding assistant and moving to another. Is reliability now the deciding factor?"));
    expect(result.personalFit).toBeGreaterThanOrEqual(85);
    expect(result.conversationOpening).toBeGreaterThanOrEqual(80);
    expect(result.suggestedAngle).toContain("workflow fit");
  });

  it("recognizes Git debates and proposes a traceability angle", () => {
    const result = analyzeLocally(post("What if agent-written software no longer needs Git?"));
    expect(result.personalFit).toBeGreaterThanOrEqual(90);
    expect(result.conversationOpening).toBeGreaterThanOrEqual(70);
    expect(result.suggestedAngle).toContain("traceability");
  });

  it("keeps broader social-product debates in the owner preference lane", () => {
    const result = analyzeLocally(post("Why did a new social platform fail even with a huge existing audience?"));
    expect(result.personalFit).toBeGreaterThanOrEqual(68);
    expect(result.conversationOpening).toBeGreaterThanOrEqual(70);
  });

  it("rejects promotion and generic tool polls", () => {
    expect(analyzeLocally(post("Follow me and like if you use AI—check out my product now.")).conversationOpening).toBeLessThan(50);
    expect(analyzeLocally(post("What is your favorite AI tool?")).conversationOpening).toBeLessThan(50);
  });

  it("keeps unrelated content outside the personal lane", () => {
    expect(analyzeLocally(post("A token is moving across crypto markets today.")).personalFit).toBeLessThan(50);
  });

  it("makes brevity a material signal while allowing the scorer to handle exceptional trends", () => {
    const concise = analyzeLocally(post("Should coding agents always require review?"));
    const long = analyzeLocally(post("A changing AI landscape creates new workflow questions. ".repeat(16), "note"));
    expect(concise.brevity).toBe(100);
    expect(long.brevity).toBe(10);
  });

  it("never switches to external-model processing", async () => {
    const candidate = post("Why should AI code always be reviewed?");
    await expect(analyzePosts([candidate])).resolves.toEqual([analyzeLocally(candidate)]);
  });
});
