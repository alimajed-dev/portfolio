import { afterEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ blockRadarPost: vi.fn() }));
const admin = vi.hoisted(() => ({ sameOrigin: vi.fn(), authorizeManualRefresh: vi.fn() }));
vi.mock("@/lib/x-radar/cache", () => cache);
vi.mock("@/lib/x-radar/admin", () => admin);
vi.mock("@/lib/rate-limit", () => ({ clientIp: () => "client" }));

import { POST } from "@/app/api/conversation-radar/remove/route";

function request(body: unknown) {
  return new Request("https://majedali.com/api/conversation-radar/remove", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("Radar removal endpoint", () => {
  it("requires same-origin owner authorization", async () => {
    admin.sameOrigin.mockReturnValue(false);
    expect((await POST(request({ postId: "123" }))).status).toBe(403);
    expect(cache.blockRadarPost).not.toHaveBeenCalled();
  });

  it("rejects malformed post IDs", async () => {
    admin.sameOrigin.mockReturnValue(true);
    admin.authorizeManualRefresh.mockReturnValue({ ok: true });
    expect((await POST(request({ postId: "not-an-id" }))).status).toBe(400);
    expect(cache.blockRadarPost).not.toHaveBeenCalled();
  });

  it("purges a valid post immediately", async () => {
    admin.sameOrigin.mockReturnValue(true);
    admin.authorizeManualRefresh.mockReturnValue({ ok: true });
    cache.blockRadarPost.mockResolvedValue(undefined);
    const response = await POST(request({ postId: "2089672348190621790" }));
    expect(response.status).toBe(204);
    expect(cache.blockRadarPost).toHaveBeenCalledWith("2089672348190621790");
  });
});
