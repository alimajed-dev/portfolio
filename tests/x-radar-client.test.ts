import { afterEach, describe, expect, it, vi } from "vitest";
import { searchRecentPosts } from "@/lib/x-radar/x-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function allowApi() {
  vi.stubEnv("X_BEARER_TOKEN", "test-token");
}

describe("X radar search", () => {
  it("refuses to access X without a server-side bearer token", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(searchRecentPosts()).rejects.toThrow(/X_BEARER_TOKEN is not configured/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requests a broad, recent, original-post candidate pool through the official API", async () => {
    allowApi();
    vi.stubEnv("X_OWNER_USERNAME", "AliMajed93");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));

    await searchRecentPosts();
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    const query = url.searchParams.get("query")!;
    expect(url.searchParams.get("sort_order")).toBe("recency");
    expect(url.searchParams.get("max_results")).toBe("30");
    expect(query).toContain("min_replies:3");
    expect(query).toContain("min_likes:20");
    expect(query).toContain('"hot take"');
    expect(query).toContain('"one thing"');
    expect(query).toContain("cancelling");
    expect(query).toContain("Threads");
    expect(query).toContain("SaaS");
    expect(query).toContain("GitHub");
    expect(query).toContain("-is:reply");
    expect(query).toContain("-is:retweet");
    expect(query).toContain("-is:quote");
    expect(query).toContain("-is:nullcast");
    expect(query).toContain("-has:links");
    expect(query.length).toBeLessThanOrEqual(512);
    expect(url.searchParams.get("tweet.fields")).toContain("entities");
    expect(url.searchParams.get("tweet.fields")).toContain("withheld");
    expect(url.searchParams.get("user.fields")).toBe("name,username,profile_image_url");
    const ageHours = (Date.now() - new Date(url.searchParams.get("start_time")!).getTime()) / 3_600_000;
    expect(ageHours).toBeGreaterThan(23.9);
    expect(ageHours).toBeLessThan(24.1);
  });

  it("retains only display-required author data, public metrics, and linked entities", async () => {
    allowApi();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "123", text: "Ask @engineer about #RAG at https://t.co/example", author_id: "456", created_at: "2026-08-19T08:00:00Z", entities: {
        mentions: [{ start: 4, end: 13, username: "engineer" }],
        hashtags: [{ start: 20, end: 24, tag: "RAG" }],
        urls: [{ start: 28, end: 48, url: "https://t.co/example", display_url: "example.com/post" }],
      }, public_metrics: { like_count: 30, reply_count: 8, repost_count: 2, quote_count: 1, bookmark_count: 4, impression_count: 2_000 } }],
      includes: { users: [{ id: "456", name: "Engineer", username: "engineer", profile_image_url: "https://pbs.twimg.com/avatar.jpg", description: "not requested", public_metrics: { followers_count: 999 } }] },
    }), { status: 200 })));

    const [result] = await searchRecentPosts();
    expect(result.author).toEqual({ id: "456", name: "Engineer", username: "engineer", profileImageUrl: "https://pbs.twimg.com/avatar.jpg" });
    expect(result.metrics).toMatchObject({ likes: 30, replies: 8, reposts: 2, quotes: 1, bookmarks: 4, impressions: 2_000 });
    expect(result.entities).toEqual([
      { start: 4, end: 13, kind: "mention", value: "engineer", href: "https://x.com/engineer" },
      { start: 20, end: 24, kind: "hashtag", value: "RAG", href: "https://x.com/hashtag/RAG" },
      { start: 28, end: 48, kind: "url", value: "example.com/post", href: "https://t.co/example" },
    ]);
    expect(result.author).not.toHaveProperty("followers");
    expect(result.author).not.toHaveProperty("description");
  });

  it("uses the complete note text and note entities while rejecting article posts", async () => {
    allowApi();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: "note", text: "Truncated…", note_tweet: { text: "Complete note with #Review", entities: { hashtags: [{ start: 19, end: 26, tag: "Review" }] } }, author_id: "u1", created_at: "2026-08-19T08:00:00Z", public_metrics: { reply_count: 20 } },
        { id: "article", text: "Article teaser", article: { title: "Long article" }, author_id: "u1", created_at: "2026-08-19T08:00:00Z", public_metrics: { reply_count: 50 } },
      ],
      includes: { users: [{ id: "u1", name: "One", username: "one", profile_image_url: "https://example.com/one.jpg" }] },
    }), { status: 200 })));

    await expect(searchRecentPosts()).resolves.toMatchObject([{
      id: "note", text: "Complete note with #Review", format: "note",
      entities: [{ start: 19, end: 26, kind: "hashtag", value: "Review", href: "https://x.com/hashtag/Review" }],
    }]);
  });

  it("rejects replies, reposts, quotes, and records missing display attribution", async () => {
    allowApi();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: "1", text: "Reply", author_id: "u1", created_at: "2026-08-19T08:00:00Z", referenced_tweets: [{ type: "replied_to", id: "0" }], public_metrics: {} },
        { id: "2", text: "Missing image", author_id: "u2", created_at: "2026-08-19T08:00:00Z", public_metrics: {} },
        { id: "3", text: "Withheld", author_id: "u1", created_at: "2026-08-19T08:00:00Z", withheld: { country_codes: ["US"] }, public_metrics: {} },
      ],
      includes: { users: [{ id: "u1", name: "One", username: "one", profile_image_url: "https://example.com/one.jpg" }, { id: "u2", name: "Two", username: "two" }] },
    }), { status: 200 })));
    await expect(searchRecentPosts()).resolves.toEqual([]);
  });

  it("retains a safe upstream status for scan diagnostics", async () => {
    allowApi();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));
    await expect(searchRecentPosts()).rejects.toMatchObject({ message: "X API rate limit reached", status: 429 });
  });
});
