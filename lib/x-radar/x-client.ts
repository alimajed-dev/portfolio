import type { XPost } from "./types";

type ApiPost = { id?: string; text?: string; author_id?: string; created_at?: string; article?: unknown; note_tweet?: unknown; public_metrics?: Record<string, number>; referenced_tweets?: Array<{id?: string; type: string}>; referenced_posts?: Array<{id?: string; type: string}> };
type ApiUser = { id?: string; name?: string; username?: string; description?: string; created_at?: string; verified?: boolean; profile_image_url?: string; public_metrics?: Record<string, number> };

function averagePostsPerMonth(user: ApiUser) {
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
  const postCount = user.public_metrics?.post_count ?? user.public_metrics?.tweet_count;
  if (!Number.isFinite(createdAt) || postCount === undefined) return undefined;
  const accountAgeMonths = Math.max(1, (Date.now() - createdAt) / 2_629_800_000);
  return Math.max(0, Math.round(postCount / accountAgeMonths));
}

export async function searchRecentPosts(signal?: AbortSignal): Promise<XPost[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");
  const max = Math.min(10, Math.max(1, Number(process.env.X_MAX_POSTS_PER_SCAN) || 10));
  const lookbackHours = Math.min(168, Math.max(12, Number(process.env.X_LOOKBACK_HOURS) || 12));
  const topics = '(AI OR software OR developer OR coding OR build OR GitHub OR "source control" OR RAG OR LLM OR model OR prompt OR Claude OR Codex OR OpenAI OR ChatGPT)';
  const discussions = '(("hot take" OR think OR how OR why OR important OR harder OR strategy OR annoying OR problem OR tradeoff OR limit OR market OR replacement OR "could have") -has:links)';
  const events = '(outage OR launch OR release OR announces OR "now live")';
  const quoteConversation = '((timing OR planned) is:quote)';
  const activity = "(min_replies:3 OR min_likes:20 OR min_reposts:3)";
  const query = `((${topics} (${discussions} OR ${events})) OR ${quoteConversation}) ${activity} lang:en -is:retweet -from:${process.env.X_OWNER_USERNAME || "AliMajed93"}`;
  const params = new URLSearchParams({ query, max_results: String(max), start_time: new Date(Date.now() - lookbackHours * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"), sort_order: "relevancy", "tweet.fields": "author_id,article,note_tweet,created_at,public_metrics,referenced_tweets,lang", expansions: "author_id,referenced_tweets.id,referenced_tweets.id.author_id", "user.fields": "name,username,description,created_at,verified,profile_image_url,public_metrics" });
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "X API rate limit reached" : `X API request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  const payload = await response.json() as { data?: ApiPost[]; includes?: { users?: ApiUser[]; tweets?: ApiPost[]; posts?: ApiPost[] } };
  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  const includedPosts = new Map([...(payload.includes?.tweets ?? []), ...(payload.includes?.posts ?? [])].map((post) => [post.id, post]));
  return (payload.data ?? []).flatMap((post): XPost[] => {
    const user = users.get(post.author_id); const m = post.public_metrics;
    const references = [...(post.referenced_tweets ?? []), ...(post.referenced_posts ?? [])];
    const quote = references.find((reference) => reference.type === "quoted" || reference.type === "quote");
    const quotedPost = quote?.id ? includedPosts.get(quote.id) : undefined;
    const quotedAuthor = users.get(quotedPost?.author_id);
    if (!post.id || !post.text || !post.created_at || !user?.id || !user.username || !user.name || !m || references.some((r) => r.type === "retweeted" || r.type === "reposted")) return [];
    return [{ id: post.id, text: post.text, createdAt: post.created_at, format: post.article ? "article" : post.note_tweet ? "note" : "standard", quotedPost: quotedPost?.text ? { text: quotedPost.text, authorUsername: quotedAuthor?.username } : undefined, author: { id: user.id, name: user.name, username: user.username, description: user.description, profileImageUrl: user.profile_image_url, followers: user.public_metrics?.followers_count, postsPerMonth: averagePostsPerMonth(user), verified: user.verified }, metrics: { likes: m.like_count ?? 0, replies: m.reply_count ?? 0, reposts: m.repost_count ?? m.retweet_count ?? 0, quotes: m.quote_count ?? 0, bookmarks: m.bookmark_count ?? 0, impressions: m.impression_count } }];
  });
}
