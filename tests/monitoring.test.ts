import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  scope: { setTag: vi.fn() },
  withScope: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.captureException,
  captureMessage: sentry.captureMessage,
  withScope: sentry.withScope,
}));

import { captureOperationalError, captureRadarScan } from "@/lib/monitoring";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BETTER_STACK_DSN", "https://public-token@example.com/1");
  sentry.captureException.mockReset();
  sentry.captureMessage.mockReset();
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

  it("records privacy-safe Radar scan diagnostics", () => {
    captureRadarScan({ kind: "manual", returnedCount: 0, displayedCount: 0, opportunityCount: 0, durationMs: 420 });

    expect(sentry.scope.setTag).toHaveBeenCalledWith("area", "x-radar");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("scan_kind", "manual");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("returned_count", "0");
    expect(sentry.captureMessage).toHaveBeenCalledWith("x_radar_scan_empty", "warning");
    expect(JSON.stringify(sentry.captureMessage.mock.calls)).not.toMatch(/post|author|token|credential/i);
  });
});
