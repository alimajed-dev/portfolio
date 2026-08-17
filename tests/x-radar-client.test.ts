import { afterEach, describe, expect, it, vi } from "vitest";
import { searchRecentPosts } from "@/lib/x-radar/x-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("X radar search", () => {
  it("requests relevant candidates from an explicit 48-hour window", async () => {
    vi.stubEnv("X_BEARER_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));

    await searchRecentPosts();
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.searchParams.get("sort_order")).toBe("relevancy");
    expect(url.searchParams.get("max_results")).toBe("10");
    const ageHours = (Date.now() - new Date(url.searchParams.get("start_time")!).getTime()) / 3_600_000;
    expect(ageHours).toBeGreaterThan(47.9);
    expect(ageHours).toBeLessThan(48.1);
  });
});
