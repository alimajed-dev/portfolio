import type { XPost } from "./types";

type ApiPost = { id?: string; text?: string; author_id?: string; created_at?: string; article?: unknown; note_tweet?: unknown; public_metrics?: Record<string, number>; referenced_tweets?: Array<{type: string}> };
type ApiUser = { id?: string; name?: string; username?: string; description?: string; created_at?: string; verified?: boolean; profile_image_url?: string; public_metrics?: Record<string, number> };

function averagePostsPerMonth(user: ApiUser) {
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
  const tweetCount = user.public_metrics?.tweet_count;
  if (!Number.isFinite(createdAt) || tweetCount === undefined) return undefined;
  const accountAgeMonths = Math.max(1, (Date.now() - createdAt) / 2_629_800_000);
  return Math.max(0, Math.round(tweetCount / accountAgeMonths));
}

export async function searchRecentPosts(signal?: AbortSignal): Promise<XPost[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");
  const max = Math.min(10, Math.max(1, Number(process.env.X_MAX_POSTS_PER_SCAN) || 10));
  const lookbackHours = Math.min(168, Math.max(12, Number(process.env.X_LOOKBACK_HOURS) || 12));
  const topics = '(AI OR developer OR software OR product OR build OR coding OR packages OR "generated code" OR RAG OR LLM OR model OR prompt OR Claude OR OpenAI OR ChatGPT OR YouTube OR API)';
  const substance = '(("more important" OR harder OR hardest OR strategy OR annoying OR how OR why OR problem OR tradeoff OR debate) -has:links OR outage OR incident OR launch OR release OR announces OR introduces)';
  const activity = "(min_replies:3 OR min_likes:20 OR min_reposts:3)";
  const query = `${topics} ${substance} ${activity} lang:en -is:retweet -from:${process.env.X_OWNER_USERNAME || "AliMajed93"}`;
  const params = new URLSearchParams({ query, max_results: String(max), start_time: new Date(Date.now() - lookbackHours * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"), sort_order: "relevancy", "tweet.fields": "author_id,article,note_tweet,created_at,public_metrics,referenced_tweets,lang", expansions: "author_id", "user.fields": "name,username,description,created_at,verified,profile_image_url,public_metrics" });
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "X API rate limit reached" : `X API request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  const payload = await response.json() as { data?: ApiPost[]; includes?: { users?: ApiUser[] } };
  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  return (payload.data ?? []).flatMap((post): XPost[] => {
    const user = users.get(post.author_id); const m = post.public_metrics;
    if (!post.id || !post.text || !post.created_at || !user?.id || !user.username || !user.name || !m || post.referenced_tweets?.some((r) => r.type === "retweeted")) return [];
    return [{ id: post.id, text: post.text, createdAt: post.created_at, format: post.article ? "article" : post.note_tweet ? "note" : "standard", author: { id: user.id, name: user.name, username: user.username, description: user.description, profileImageUrl: user.profile_image_url, followers: user.public_metrics?.followers_count, postsPerMonth: averagePostsPerMonth(user), verified: user.verified }, metrics: { likes: m.like_count ?? 0, replies: m.reply_count ?? 0, reposts: m.retweet_count ?? 0, quotes: m.quote_count ?? 0, impressions: m.impression_count } }];
  });
}
