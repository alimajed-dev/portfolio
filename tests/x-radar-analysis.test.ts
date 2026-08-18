import { describe, expect, it } from "vitest";
import { analyzeLocally } from "@/lib/x-radar/analysis";
import type { XPost } from "@/lib/x-radar/types";

function post(text: string, description = "Software engineering", authority: { followers?: number; postsPerMonth?: number; verified?: boolean } = {}, format: XPost["format"] = "standard"): XPost {
  return {
    id: "1", text, createdAt: "2026-08-17T12:00:00Z", format,
    author: { id: "u1", name: "Engineer", username: "engineer", description, ...authority },
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

  it("recognizes meaningful technology-platform announcements", () => {
    const result = analyzeLocally(post("YouTube announces a major change to how video views are counted."));
    expect(result.relevance).toBeGreaterThanOrEqual(50);
  });

  it("recognizes concrete code-hosting launches and ecosystem theses", () => {
    const launch = analyzeLocally(post("Origin, our code hosting platform, is now live and deeply integrated with Cursor."));
    const thesis = analyzeLocally(post("A paid GitHub replacement could weaken how GitHub sustains the open source ecosystem."));
    expect(launch.relevance).toBeGreaterThanOrEqual(75);
    expect(launch.abilityToAddValue).toBeGreaterThanOrEqual(60);
    expect(thesis.relevance).toBeGreaterThanOrEqual(75);
    expect(thesis.abilityToAddValue).toBeGreaterThanOrEqual(60);
  });

  it("uses quoted-source text to understand a concise reaction", () => {
    const quoteReaction = post("No, the timing was not planned");
    quoteReaction.quotedPost = { text: "Origin, our code hosting platform, is now live and deeply integrated with Cursor.", authorUsername: "cursor_ai" };
    const result = analyzeLocally(quoteReaction);
    expect(result.relevance).toBeGreaterThanOrEqual(75);
    expect(result.abilityToAddValue).toBeGreaterThanOrEqual(60);
  });

  it("keeps substantive model-versus-prompt questions eligible", () => {
    const result = analyzeLocally(post("What's more important: the model or the prompt?", "AI learning", { followers: 1_000_000, postsPerMonth: 300, verified: true }));
    expect(result.abilityToAddValue).toBeGreaterThanOrEqual(70);
    expect(result.audienceValue).toBeGreaterThanOrEqual(90);
  });

  it("keeps author authority separate from topical relevance", () => {
    expect(analyzeLocally(post("AI agents, RAG, LLMs, prompts, APIs, and software development")).audienceValue).toBe(0);
    expect(analyzeLocally(post("A software observation", "", { followers: 100_000, postsPerMonth: 300, verified: true })).audienceValue).toBeGreaterThanOrEqual(80);
  });

  it("rewards active, verified authors without changing topical relevance", () => {
    const inactive = analyzeLocally(post("A concrete software architecture trade-off", "", { followers: 10_000 }));
    const active = analyzeLocally(post("A concrete software architecture trade-off", "", { followers: 10_000, postsPerMonth: 300, verified: true }));
    expect(active.audienceValue).toBeGreaterThan(inactive.audienceValue);
    expect(active.relevance).toBe(inactive.relevance);
  });

  it("keeps AI-generated code maintainability and future-of-developer debates eligible", () => {
    expect(analyzeLocally(post("What's harder: building with AI or maintaining AI generated code?")).abilityToAddValue).toBeGreaterThanOrEqual(70);
    expect(analyzeLocally(post("If AI can build anything, what becomes the hardest part of being a developer?")).relevance).toBeGreaterThanOrEqual(68);
  });

  it("keeps relatable developer pain and dependency trade-offs eligible", () => {
    expect(analyzeLocally(post("Most annoying part of vibe coding? AI writes 500 lines, then one button does not work.")).abilityToAddValue).toBeGreaterThanOrEqual(70);
    expect(analyzeLocally(post("What's your strategy: build from scratch or depend on 50 mysterious packages?")).relevance).toBeGreaterThanOrEqual(68);
  });

  it("prefers concise discussions without banning valuable long announcements", () => {
    const concise = analyzeLocally(post("What's harder about maintaining AI generated code?"));
    const longGuide = analyzeLocally(post("All you need to prepare for software engineering: here's how I'd prepare with a generic FAANG roadmap. ".repeat(8), "", {}, "note"));
    const longAnnouncement = analyzeLocally(post("Cursor launched an important AI coding platform update. ".repeat(12), "", {}, "note"));
    expect(concise.abilityToAddValue).toBeGreaterThan(longGuide.abilityToAddValue);
    expect(longAnnouncement.abilityToAddValue).toBeGreaterThanOrEqual(45);
  });
});
