import { afterEach, describe, expect, it, vi } from "vitest";
import { searchRecentPosts } from "@/lib/x-radar/x-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("X radar search", () => {
  it("requests active, relevant candidates from an explicit 12-hour window", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));

    await searchRecentPosts();
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.searchParams.get("sort_order")).toBe("relevancy");
    expect(url.searchParams.get("max_results")).toBe("10");
    expect(url.searchParams.get("query")).toContain("min_replies:3");
    expect(url.searchParams.get("query")).toContain("min_likes:20");
    expect(url.searchParams.get("query")).toContain("GitHub");
    expect(url.searchParams.get("query")).toContain('"source control"');
    expect(url.searchParams.get("query")).toContain("model");
    expect(url.searchParams.get("query")).toContain("prompt");
    expect(url.searchParams.get("query")).toContain("harder");
    expect(url.searchParams.get("query")).toContain("annoying");
    expect(url.searchParams.get("query")).toContain("strategy");
    expect(url.searchParams.get("query")).toContain("outage");
    expect(url.searchParams.get("query")).toContain("announces");
    expect(url.searchParams.get("query")).toContain("tradeoff OR debate OR replacement OR alternative) -has:links OR outage");
    expect(url.searchParams.get("query")).toContain('"now live"');
    expect(url.searchParams.get("query")).toContain('"not planned"');
    expect(url.searchParams.get("query")).toContain("is:quote");
    expect(url.searchParams.get("tweet.fields")).toContain("article");
    expect(url.searchParams.get("tweet.fields")).toContain("note_tweet");
    expect(url.searchParams.get("user.fields")).toContain("verified");
    expect(url.searchParams.get("user.fields")).toContain("created_at");
    expect(url.searchParams.get("user.fields")).toContain("public_metrics");
    expect(url.searchParams.get("expansions")).toContain("referenced_tweets.id");
    expect(url.searchParams.get("query")).toContain("ChatGPT");
    expect(url.searchParams.get("query")!.length).toBeLessThanOrEqual(512);
    expect(url.searchParams.get("query")).not.toContain("crypto");
    const ageHours = (Date.now() - new Date(url.searchParams.get("start_time")!).getTime()) / 3_600_000;
    expect(ageHours).toBeGreaterThan(11.9);
    expect(ageHours).toBeLessThan(12.1);
  });

  it("retains author authority metadata returned with a candidate", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "p1", text: "What is harder about maintaining AI generated code?", author_id: "u1", created_at: "2026-08-17T12:00:00Z", note_tweet: { text: "Full note" }, public_metrics: { like_count: 30, reply_count: 5, repost_count: 4, bookmark_count: 9 } }],
      includes: { users: [{ id: "u1", name: "Microsoft Learn", username: "MicrosoftLearn", created_at: "2020-01-01T00:00:00Z", verified: true, public_metrics: { followers_count: 1_000_000, post_count: 12_000 } }] },
    }), { status: 200 })));

    const [result] = await searchRecentPosts();
    expect(result.author.verified).toBe(true);
    expect(result.author.followers).toBe(1_000_000);
    expect(result.author.postsPerMonth).toBeGreaterThan(0);
    expect(result.format).toBe("note");
    expect(result.metrics.reposts).toBe(4);
    expect(result.metrics.bookmarks).toBe(9);
  });

  it("retains quoted-source context from the same search response", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "q1", text: "No, the timing was not planned", author_id: "u1", created_at: "2026-08-17T12:00:00Z", referenced_tweets: [{ type: "quoted", id: "origin" }], public_metrics: { like_count: 805, reply_count: 76, repost_count: 15, quote_count: 5, bookmark_count: 51 } }],
      includes: {
        users: [
          { id: "u1", name: "Krista", username: "kristaletz", public_metrics: { followers_count: 50_000 } },
          { id: "u2", name: "Cursor", username: "cursor_ai", public_metrics: { followers_count: 500_000 } },
        ],
        tweets: [{ id: "origin", text: "Origin, our code hosting platform, is now live and deeply integrated with Cursor.", author_id: "u2" }],
      },
    }), { status: 200 })));

    const [result] = await searchRecentPosts();
    expect(result.quotedPost).toEqual({
      text: "Origin, our code hosting platform, is now live and deeply integrated with Cursor.",
      authorUsername: "cursor_ai",
    });
  });

  it("retains a safe upstream status for scan diagnostics", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));

    await expect(searchRecentPosts()).rejects.toMatchObject({ message: "X API rate limit reached", status: 429 });
  });
});
