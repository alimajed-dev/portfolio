import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  scope: { setTag: vi.fn() },
  withScope: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.captureException,
  withScope: sentry.withScope,
}));

import { captureOperationalError } from "@/lib/monitoring";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BETTER_STACK_DSN", "https://public-token@example.com/1");
  sentry.captureException.mockReset();
  sentry.scope.setTag.mockReset();
  sentry.withScope.mockReset().mockImplementation((callback) => callback(sentry.scope));
});

describe("captureOperationalError", () => {
  it("reports controlled metadata without forwarding the provider's message", () => {
    const providerError = Object.assign(
      new Error("private prompt and model output: API_KEY=secret"),
      { statusCode: 429 },
    );

    captureOperationalError(providerError, {
      area: "agent-pipeline",
      code: "pipeline_step_failed",
      step: "planner",
    });

    const reported = sentry.captureException.mock.calls[0][0] as Error;
    expect(reported.message).toBe("pipeline_step_failed (429)");
    expect(reported.message).not.toMatch(/private prompt|model output|secret/);
    expect(sentry.scope.setTag).toHaveBeenCalledWith("pipeline_step", "planner");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("upstream_status", "429");
  });
});
