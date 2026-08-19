import type { PostEntity, XPost } from "./types";
import { lookbackHours, maxPostsPerScan } from "./config";

type ApiEntities = {
  urls?: Array<{ start?: number; end?: number; url?: string; display_url?: string }>;
  mentions?: Array<{ start?: number; end?: number; username?: string }>;
  hashtags?: Array<{ start?: number; end?: number; tag?: string }>;
};
type ApiNoteTweet = { text?: string; entities?: ApiEntities };
type ApiPost = { id?: string; text?: string; author_id?: string; created_at?: string; article?: unknown; note_tweet?: ApiNoteTweet; entities?: ApiEntities; withheld?: unknown; public_metrics?: Record<string, number>; referenced_tweets?: Array<{id?: string; type: string}>; referenced_posts?: Array<{id?: string; type: string}> };
type ApiUser = { id?: string; name?: string; username?: string; profile_image_url?: string };

function entity(start: number | undefined, end: number | undefined, kind: PostEntity["kind"], value: string | undefined, href: string | undefined): PostEntity[] {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start! < 0 || end! <= start! || !value || !href) return [];
  return [{ start: start!, end: end!, kind, value, href }];
}

function postEntities(source?: ApiEntities) {
  const entities = [
    ...(source?.urls ?? []).flatMap((item) => entity(item.start, item.end, "url", item.display_url, item.url)),
    ...(source?.mentions ?? []).flatMap((item) => entity(item.start, item.end, "mention", item.username, item.username ? `https://x.com/${item.username}` : undefined)),
    ...(source?.hashtags ?? []).flatMap((item) => entity(item.start, item.end, "hashtag", item.tag, item.tag ? `https://x.com/hashtag/${encodeURIComponent(item.tag)}` : undefined)),
  ];
  return entities.sort((a, b) => a.start - b.start || b.end - a.end);
}

export async function searchRecentPosts(signal?: AbortSignal): Promise<XPost[]> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not configured");
  const max = maxPostsPerScan();
  const lookback = lookbackHours();
  const topics = '(AI OR Claude OR Anthropic OR OpenAI OR ChatGPT OR Grok OR Cursor OR GitHub OR git OR coding OR developer OR software OR SaaS OR founder OR build OR Threads OR Instagram)';
  const openings = '("hot take" OR "one thing" OR what OR why OR how OR should OR never OR cancel OR cancelling OR moving OR switch OR replace OR need OR worry OR agree OR disagree OR harder OR problem OR flop OR tradeoff OR changed)';
  const activity = "(min_replies:3 OR min_likes:20)";
  const owner = (process.env.X_OWNER_USERNAME || "AliMajed93").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15) || "AliMajed93";
  const query = `(${topics} ${openings}) ${activity} lang:en -is:retweet -is:reply -is:quote -is:nullcast -has:links -from:${owner}`;
  if (query.length > 512) throw new Error("X search query exceeds the self-serve query limit");
  const params = new URLSearchParams({ query, max_results: String(max), start_time: new Date(Date.now() - lookback * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"), sort_order: "recency", "tweet.fields": "author_id,article,note_tweet,created_at,entities,public_metrics,referenced_tweets,withheld,lang", expansions: "author_id", "user.fields": "name,username,profile_image_url" });
  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "X API rate limit reached" : `X API request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  const payload = await response.json() as { data?: ApiPost[]; includes?: { users?: ApiUser[]; tweets?: ApiPost[]; posts?: ApiPost[] } };
  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  return (payload.data ?? []).flatMap((post): XPost[] => {
    const user = users.get(post.author_id); const m = post.public_metrics;
    const references = [...(post.referenced_tweets ?? []), ...(post.referenced_posts ?? [])];
    const fullText = post.note_tweet?.text ?? post.text;
    if (!post.id || !fullText || !post.created_at || post.article || post.withheld || !user?.id || !user.username || !user.name || !user.profile_image_url || !m || references.length > 0) return [];
    return [{ id: post.id, text: fullText, createdAt: post.created_at, format: post.note_tweet ? "note" : "standard", entities: postEntities(post.note_tweet?.entities ?? post.entities), author: { id: user.id, name: user.name, username: user.username, profileImageUrl: user.profile_image_url }, metrics: { likes: m.like_count ?? 0, replies: m.reply_count ?? 0, reposts: m.repost_count ?? m.retweet_count ?? 0, quotes: m.quote_count ?? 0, bookmarks: m.bookmark_count ?? 0, impressions: m.impression_count } }];
  });
}
