import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  scope: { setTag: vi.fn() },
  withScope: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentry.captureMessage,
  withScope: sentry.withScope,
}));

import { capturePixelEvent } from "@/lib/pixel-monitoring";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BETTER_STACK_DSN", "https://public-token@example.com/1");
  sentry.captureMessage.mockReset();
  sentry.scope.setTag.mockReset();
  sentry.withScope.mockReset().mockImplementation((callback) => callback(sentry.scope));
});

describe("capturePixelEvent", () => {
  it("logs only controlled lifecycle metadata", () => {
    capturePixelEvent("webgl_ready");

    expect(sentry.scope.setTag).toHaveBeenCalledWith("area", "pixel-experience");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("pixel_event", "webgl_ready");
    expect(sentry.captureMessage).toHaveBeenCalledWith("pixel_webgl_ready", "info");
  });

  it("marks a missing WebGL context as a warning", () => {
    capturePixelEvent("webgl_unavailable");
    expect(sentry.captureMessage).toHaveBeenCalledWith("pixel_webgl_unavailable", "warning");
  });
});
