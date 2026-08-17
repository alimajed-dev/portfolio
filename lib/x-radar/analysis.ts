import { generateText } from "ai";
import { geminiModel } from "@/lib/models";
import type { RelevanceAnalysis, XPost } from "./types";

const TOPICS = ["AI engineering disagreements and trade-offs", "AI product quality, cost and security", "AI-assisted SDLC and maintainability", "AI agents, RAG and production reliability", "meaningful launches, incidents and model changes", "controversial questions about the future of software engineering"];
type AiRelevanceAnalysis = Omit<RelevanceAnalysis, "audienceValue">;

function replyLengthPenalty(post: XPost) {
  const longForm = post.format === "note" || post.format === "article" || post.text.length > 600;
  const announcement = /announc|launch|releas|introduc|now live/i.test(post.text);
  return longForm ? (announcement ? 6 : 14) : post.text.length > 360 ? 6 : 0;
}

export function analyzeLocally(post: XPost): RelevanceAnalysis {
  const text = `${post.text} ${post.author.description ?? ""}`.toLowerCase();
  const hits = ["ai", "ai agent", "coding agent", "agentic ai", "artificial intelligence", "developer", "generated code", "vibe coding", "build", "package", "dependency", "maintain", "software engineering", "software development", "sdlc", "rag", "retrieval augmented", "aws", "bedrock", "cloud", "api", "context engineering", "llm", "model", "prompt", "eval", "observability", "hallucination", "guardrail", "prompt injection", "ai security", "model reliability", "developer tooling", "claude", "anthropic", "openai", "chatgpt", "gemini", "copilot", "cursor ai", "windsurf", "youtube", "code review", "testing", "ai slop", "watermark"].filter((term) => text.includes(term)).length;
  const asks = /\?|how |why |opinion|lesson|take|think|struggl|trade.?off|bottleneck/i.test(post.text);
  const promotional = /check it out|buy now|like if|\bfollow\b|giveaway/i.test(post.text);
  const shallowPrompt = /which (?:ai )?tool|what(?:'s| is) your (?:favou?rite )?(?:ai )?tool|what tool (?:do you use|are you using)|are you using (?:claude|chatgpt|cursor|copilot|gemini|windsurf)|opening first|\b10 ai skills\b|only ai map|(?:all|everything) you need|here(?:'s| is) how i(?:'d| would) prepare|generic .* roadmap/i.test(post.text);
  const lengthPenalty = replyLengthPenalty(post);
  // A declarative technical observation can still invite a valuable response;
  // questions get a boost, but are not the only eligible conversation shape.
  const relevance = Math.min(96, 44 + hits * 12);
  const abilityToAddValue = Math.max(15, Math.min(94, 55 + (asks ? 22 : 0) - (promotional ? 42 : 0) - (shallowPrompt ? 38 : 0) - lengthPenalty));
  const whyReply = promotional
    ? "Promotional or engagement-bait language leaves little room for a credible professional contribution."
    : shallowPrompt
      ? "A generic tool poll or list offers little room for a substantive engineering contribution."
    : asks
      ? "A relevant professional discussion with a clear opening for a practical, experience-based contribution."
      : "A substantive technical observation where a concrete delivery or architecture lesson could extend the discussion.";
  const suggestedAngle = promotional
    ? "Skip unless the thread develops into a substantive technical discussion."
    : shallowPrompt
      ? "Skip unless the replies develop into a concrete engineering trade-off."
    : "Add a concrete delivery or architecture lesson that moves the discussion beyond the headline.";
  const followerAuthority = post.author.followers ? Math.min(80, Math.round(Math.log10(post.author.followers + 1) * 13)) : 0;
  const activityAuthority = post.author.postsPerMonth ? Math.min(12, Math.round(Math.log10(post.author.postsPerMonth + 1) * 6)) : 0;
  const audienceValue = Math.min(100, followerAuthority + activityAuthority + (post.author.verified ? 8 : 0));
  return { relevance, abilityToAddValue, audienceValue, whyReply, suggestedAngle };
}

export async function analyzePosts(posts: XPost[], signal?: AbortSignal): Promise<RelevanceAnalysis[]> {
  const approvedPaidInference = process.env.X_RADAR_AI_ENABLED === "true" && process.env.X_RADAR_GEMINI_DATA_TERMS_CONFIRMED === "true";
  if (!approvedPaidInference || !(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)) return posts.map(analyzeLocally);
  try {
    const { text } = await generateText({ model: geminiModel, maxRetries: 0, abortSignal: signal, prompt: `Evaluate how valuable it would be for Ali, a software engineer and solutions architect, to reply now. Topics: ${TOPICS.join(", ")}. Reward BOTH expert relevance and a real opening to add value. Penalize hype, promotion and engagement bait. Return only a JSON array in input order with relevance, abilityToAddValue (integers 0-100), whyReply (one concise sentence), suggestedAngle (one concise sentence). Posts:\n${JSON.stringify(posts.map((p) => ({ text: p.text, authorBio: p.author.description })))}` });
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as AiRelevanceAnalysis[];
    if (!Array.isArray(parsed) || parsed.length !== posts.length) throw new Error("Malformed AI analysis");
    return parsed.map((item, index) => {
      const local = analyzeLocally(posts[index]);
      return { ...local, relevance: item.relevance, abilityToAddValue: Math.max(15, item.abilityToAddValue - replyLengthPenalty(posts[index])), whyReply: item.whyReply, suggestedAngle: item.suggestedAngle };
    });
  } catch {
    return posts.map(analyzeLocally);
  }
}
