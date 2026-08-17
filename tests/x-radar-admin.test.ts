import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function request(token: string, origin = "https://majedali.com") {
  return new Request("https://majedali.com/api/conversation-radar/refresh", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, origin, host: "majedali.com" },
  });
}

describe("manual radar authorization", () => {
  it("accepts only the configured long owner token from the same origin", async () => {
    vi.stubEnv("X_RADAR_ADMIN_TOKEN", "a".repeat(48));
    const { authorizeManualRefresh, sameOrigin } = await import("@/lib/x-radar/admin");
    expect(sameOrigin(request("a".repeat(48)))).toBe(true);
    expect(sameOrigin(request("a".repeat(48), "https://attacker.example"))).toBe(false);
    expect(authorizeManualRefresh(request("a".repeat(48)), "203.0.113.1").ok).toBe(true);
    expect(authorizeManualRefresh(request("wrong"), "203.0.113.2").ok).toBe(false);
  });

  it("throttles repeated failed unlock attempts", async () => {
    vi.stubEnv("X_RADAR_ADMIN_TOKEN", "b".repeat(48));
    const { authorizeManualRefresh } = await import("@/lib/x-radar/admin");
    let result = authorizeManualRefresh(request("wrong"), "203.0.113.3");
    for (let attempt = 1; attempt < 5; attempt += 1) result = authorizeManualRefresh(request("wrong"), "203.0.113.3");
    expect(result).toEqual({ ok: false, limited: true });
  });
});
