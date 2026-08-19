import type { RelevanceAnalysis, XPost } from "./types";

const score = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function brevityScore(post: XPost) {
  const length = Array.from(post.text).length;
  if (post.format === "article") return 5;
  if (post.format === "note") return length <= 280 ? 65 : 10;
  if (length <= 100) return 100;
  if (length <= 180) return 90;
  if (length <= 280) return 72;
  if (length <= 420) return 45;
  if (length <= 600) return 25;
  return 10;
}

export function analyzeLocally(post: XPost): RelevanceAnalysis {
  const text = `${post.text} ${post.quotedPost?.text ?? ""}`.toLowerCase();
  const aiTools = /\b(ai|llm|model|agent|coding assistant|claude|anthropic|openai|chatgpt|grok|cursor|codex|gemini|copilot|windsurf)\b/i.test(text);
  const engineering = /\b(git|github|code|coding|developer|software|repository|source control|testing|architecture|api|rag)\b/i.test(text);
  const builder = /\b(saas|founder|build|building|ship|shipping|mvp|product|customer|distribution)\b/i.test(text);
  const platforms = /\b(threads|instagram|facebook|meta|youtube|creator|social platform)\b/i.test(text);
  const groups = [aiTools, engineering, builder, platforms].filter(Boolean).length;
  const personalFit = score(Math.max(aiTools ? 88 : 0, engineering ? 84 : 0, builder ? 76 : 0, platforms ? 68 : 0) + Math.max(0, groups - 1) * 4);

  const directQuestion = /\?|\b(what|why|how|should|would|could|which)\b/i.test(text);
  const polarizing = /\bhot take\b|\b(?:agree|disagree)\b|\bshould not\b|\bshouldn't\b|\bnever\b|\bdon't need\b|\bdo not need\b/i.test(text);
  const switching = /\b(cancel|cancelling|canceling|switch|switching|moving|replace|replacement|alternative)\b/i.test(text);
  const friction = /\b(problem|harder|annoying|worry|limit|pricing|unreliable|reliability|flop|trade.?off)\b/i.test(text);
  const changingLandscape = /\b(changed|changing|become|became|today|lately)\b/i.test(text);
  const promotional = /check it out|buy now|like if|\bfollow\b|giveaway|subscribe now/i.test(text);
  const shallowPoll = /which (?:ai )?tool|what(?:'s| is) your favou?rite (?:ai )?tool|what tool do you use/i.test(text);
  const conversationOpening = promotional || shallowPoll ? 15 : score(38 + (directQuestion ? 35 : 0) + (polarizing ? 30 : 0) + (switching ? 22 : 0) + (friction ? 15 : 0) + (changingLandscape ? 10 : 0));
  const brevity = brevityScore(post);

  const whyReply = promotional
    ? "Promotional language leaves little room for a credible contribution."
    : shallowPoll
      ? "A generic tool poll is unlikely to produce a substantive professional exchange."
      : polarizing
        ? "A concise, debatable position creates a clear opening for a grounded counterpoint."
        : directQuestion
          ? "A direct question creates an explicit opening for a practical answer."
          : switching
            ? "A concrete product-switching decision invites a useful workflow comparison."
            : changingLandscape
              ? "A fast-moving industry claim can support a timely, evidence-based perspective."
              : "A relevant professional claim may support a concrete delivery perspective.";
  const suggestedAngle = /\b(git|github|source control)\b/i.test(text)
    ? "Explain how traceability, rollback, and review become more important when agents write more code."
    : /\bjunior|fundamentals?\b/i.test(text)
      ? "Separate access to AI from the guardrails that build understanding, review habits, and accountability."
      : switching
        ? "Compare the tools through reliability, workflow fit, and the cost of switching rather than brand loyalty."
        : builder
          ? "Offer one concrete product-delivery lesson and acknowledge the trade-off on the other side."
          : "Take a direct position and add one concrete implementation or delivery reason.";
  return { personalFit, conversationOpening, brevity, whyReply, suggestedAngle };
}

export async function analyzePosts(posts: XPost[], signal?: AbortSignal): Promise<RelevanceAnalysis[]> {
  signal?.throwIfAborted();
  return posts.map(analyzeLocally);
}
