import { generateText } from "ai";
import { geminiModel } from "@/lib/models";
import type { RelevanceAnalysis, XPost } from "./types";

const TOPICS = ["AI agents and coding agents", "agentic AI", "AI-assisted SDLC and software engineering", "RAG and retrieval systems", "AWS and Amazon Bedrock", "context engineering", "LLM evaluation and observability", "AI reliability, security, hallucinations and implementation problems", "Claude, ChatGPT, Gemini, Copilot, Cursor, Windsurf and new AI developer tools"];

export function analyzeLocally(post: XPost): RelevanceAnalysis {
  const text = `${post.text} ${post.author.description ?? ""}`.toLowerCase();
  const hits = ["ai agent", "coding agent", "agentic ai", "artificial intelligence", "software engineering", "software development", "sdlc", "rag", "retrieval augmented", "aws", "bedrock", "context engineering", "llm", "eval", "observability", "hallucination", "guardrail", "prompt injection", "ai security", "model reliability", "developer tooling", "claude", "chatgpt", "gemini", "copilot", "cursor ai", "windsurf", "code review", "testing"].filter((term) => text.includes(term)).length;
  const asks = /\?|how |why |opinion|lesson|take|think|struggl|trade.?off|bottleneck/i.test(post.text);
  const promotional = /check it out|buy now|like if|follow me|giveaway/i.test(post.text);
  // A declarative technical observation can still invite a valuable response;
  // questions get a boost, but are not the only eligible conversation shape.
  const relevance = Math.min(96, 44 + hits * 12);
  const abilityToAddValue = Math.max(15, Math.min(94, 55 + (asks ? 22 : 0) - (promotional ? 42 : 0)));
  const whyReply = promotional
    ? "Promotional or engagement-bait language leaves little room for a credible professional contribution."
    : asks
      ? "A relevant professional discussion with a clear opening for a practical, experience-based contribution."
      : "A substantive technical observation where a concrete delivery or architecture lesson could extend the discussion.";
  const suggestedAngle = promotional
    ? "Skip unless the thread develops into a substantive technical discussion."
    : "Add a concrete delivery or architecture lesson that moves the discussion beyond the headline.";
  return { relevance, abilityToAddValue, audienceValue: Math.min(88, 50 + hits * 6), whyReply, suggestedAngle };
}

export async function analyzePosts(posts: XPost[], signal?: AbortSignal): Promise<RelevanceAnalysis[]> {
  const approvedPaidInference = process.env.X_RADAR_AI_ENABLED === "true" && process.env.X_RADAR_GEMINI_DATA_TERMS_CONFIRMED === "true";
  if (!approvedPaidInference || !(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) return posts.map(analyzeLocally);
  try {
    const { text } = await generateText({ model: geminiModel, maxRetries: 0, abortSignal: signal, prompt: `Evaluate how valuable it would be for Ali, a software engineer and solutions architect, to reply now. Topics: ${TOPICS.join(", ")}. Reward BOTH expert relevance and a real opening to add value. Penalize hype, promotion and engagement bait. Return only a JSON array in input order with relevance, abilityToAddValue, audienceValue (integers 0-100), whyReply (one concise sentence), suggestedAngle (one concise sentence). Posts:\n${JSON.stringify(posts.map((p) => ({ text: p.text, authorBio: p.author.description, followers: p.author.followers })))}` });
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as RelevanceAnalysis[];
    if (!Array.isArray(parsed) || parsed.length !== posts.length) throw new Error("Malformed AI analysis");
    return parsed.map((item, index) => ({ ...analyzeLocally(posts[index]), ...item }));
  } catch {
    return posts.map(analyzeLocally);
  }
}
