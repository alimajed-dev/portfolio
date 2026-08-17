import { describe, expect, it } from "vitest";
import { analyzeLocally } from "@/lib/x-radar/analysis";
import type { XPost } from "@/lib/x-radar/types";

function post(text: string, description = "Software engineering"): XPost {
  return {
    id: "1", text, createdAt: "2026-08-17T12:00:00Z",
    author: { id: "u1", name: "Engineer", username: "engineer", description },
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
    expect(result.whyReply).toContain("Promotional");
    expect(result.suggestedAngle).toContain("Skip");
  });

  it("keeps unrelated crypto promotion outside the professional topic lane", () => {
    const result = analyzeLocally(post("A new token is pumping across crypto markets today.", "Crypto trader"));
    expect(result.relevance).toBeLessThan(50);
  });

  it("recognizes RAG and AI engineering implementation problems", () => {
    const result = analyzeLocally(post("How are teams evaluating RAG reliability and hallucinations on AWS Bedrock?"));
    expect(result.relevance).toBeGreaterThanOrEqual(80);
    expect(result.abilityToAddValue).toBeGreaterThanOrEqual(70);
  });

  it("recognizes discussions about new AI developer tools", () => {
    const result = analyzeLocally(post("Claude Code and GitHub Copilot changed how our team reviews pull requests."));
    expect(result.relevance).toBeGreaterThanOrEqual(80);
  });

  it("penalizes generic tool polls even when they mention relevant products", () => {
    const result = analyzeLocally(post("Which tool are you opening first: Cursor, Claude Code, ChatGPT, or Windsurf?"));
    expect(result.abilityToAddValue).toBeLessThan(45);
    expect(result.whyReply).toContain("generic tool poll");
  });

  it("keeps concrete AI product disagreements valuable", () => {
    const result = analyzeLocally(post("Why is Anthropic repeating OpenAI's product decision when it creates a serious quality tradeoff?"));
    expect(result.relevance).toBeGreaterThanOrEqual(68);
    expect(result.abilityToAddValue).toBeGreaterThanOrEqual(70);
  });
});
