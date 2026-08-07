import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubMonitoringBreadcrumb, scrubMonitoringEvent } from "@/lib/monitoring-config";

describe("monitoring privacy filters", () => {
  it("removes visitor data, request content, credentials, and URL query values", () => {
    const event = scrubMonitoringEvent({
      exception: { values: [{ type: "Error", value: "safe failure" }] },
      extra: { prompt: "private prompt" },
      user: { email: "visitor@example.com" },
      request: {
        cookies: { session: "secret" },
        data: "private prompt",
        headers: { authorization: "Bearer secret" },
        method: "POST",
        query_string: "token=secret",
        url: "https://majedali.com/api/agent?token=secret",
      },
    } as unknown as ErrorEvent);

    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.request).toEqual({ method: "POST", url: "https://majedali.com/api/agent" });
    expect(JSON.stringify(event)).not.toMatch(/private prompt|visitor@example|Bearer|secret/);
  });

  it("drops interaction and console breadcrumbs while retaining a query-free route", () => {
    expect(scrubMonitoringBreadcrumb({ category: "console", message: "private prompt" })).toBeNull();
    expect(scrubMonitoringBreadcrumb({ category: "ui.input", message: "typed text" })).toBeNull();
    expect(
      scrubMonitoringBreadcrumb({
        category: "navigation",
        data: { from: "/?secret=yes", to: "/contact?email=private" },
      }),
    ).toEqual({
      category: "navigation",
      data: { from: "/", to: "/contact" },
      level: undefined,
      timestamp: undefined,
      type: undefined,
    });
  });
});
