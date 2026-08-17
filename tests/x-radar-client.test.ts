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
    expect(url.searchParams.get("query")).toContain('"AI agents"');
    expect(url.searchParams.get("query")).toContain('"AWS Bedrock"');
    expect(url.searchParams.get("query")).toContain("Anthropic");
    expect(url.searchParams.get("query")).toContain("quality");
    expect(url.searchParams.get("query")).toContain("architecture");
    expect(url.searchParams.get("query")).toContain('"AI slop"');
    expect(url.searchParams.get("query")).toContain("ChatGPT");
    expect(url.searchParams.get("query")!.length).toBeLessThanOrEqual(512);
    expect(url.searchParams.get("query")).not.toContain("crypto");
    const ageHours = (Date.now() - new Date(url.searchParams.get("start_time")!).getTime()) / 3_600_000;
    expect(ageHours).toBeGreaterThan(11.9);
    expect(ageHours).toBeLessThan(12.1);
  });
});
