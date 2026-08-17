import { generateText } from "ai";
import { geminiModel } from "@/lib/models";
import type { RelevanceAnalysis, XPost } from "./types";

const TOPICS = ["AI in software delivery", "AI agents and coding agents", "context engineering", "software and solution architecture", "engineering leadership", "developer tooling and productivity", "technical product development", "React, TypeScript and AWS when technically substantive"];

function fallback(post: XPost): RelevanceAnalysis {
  const text = `${post.text} ${post.author.description ?? ""}`.toLowerCase();
  const hits = ["agent", "architecture", "software", "engineering", "developer", "typescript", "react", "aws", "context", "delivery", "code review", "testing"].filter((term) => text.includes(term)).length;
  const asks = /\?|how |why |opinion|lesson|take|think|struggl|trade.?off|bottleneck/i.test(post.text);
  const promotional = /check it out|launching|buy now|like if|follow me|giveaway/i.test(post.text);
  const relevance = Math.min(96, 38 + hits * 10);
  const abilityToAddValue = Math.max(15, Math.min(94, 48 + (asks ? 28 : 0) - (promotional ? 38 : 0)));
  return { relevance, abilityToAddValue, audienceValue: Math.min(88, 48 + hits * 6), whyReply: asks ? "A relevant professional discussion with a clear opening for a practical, experience-based contribution." : "Relevant to Ali’s work, though the opening for a substantive reply is limited.", suggestedAngle: "Add a concrete delivery or architecture lesson that moves the discussion beyond the headline." };
}

export async function analyzePosts(posts: XPost[], signal?: AbortSignal): Promise<RelevanceAnalysis[]> {
  const approvedPaidInference = process.env.X_RADAR_AI_ENABLED === "true" && process.env.X_RADAR_GEMINI_DATA_TERMS_CONFIRMED === "true";
  if (!approvedPaidInference || !(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) return posts.map(fallback);
  try {
    const { text } = await generateText({ model: geminiModel, maxRetries: 0, abortSignal: signal, prompt: `Evaluate how valuable it would be for Ali, a software engineer and solutions architect, to reply now. Topics: ${TOPICS.join(", ")}. Reward BOTH expert relevance and a real opening to add value. Penalize hype, promotion and engagement bait. Return only a JSON array in input order with relevance, abilityToAddValue, audienceValue (integers 0-100), whyReply (one concise sentence), suggestedAngle (one concise sentence). Posts:\n${JSON.stringify(posts.map((p) => ({ text: p.text, authorBio: p.author.description, followers: p.author.followers })))}` });
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as RelevanceAnalysis[];
    if (!Array.isArray(parsed) || parsed.length !== posts.length) throw new Error("Malformed AI analysis");
    return parsed.map((item, index) => ({ ...fallback(posts[index]), ...item }));
  } catch {
    return posts.map(fallback);
  }
}
