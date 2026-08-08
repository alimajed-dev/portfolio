"use client";

import * as Sentry from "@sentry/nextjs";

export type PixelEvent = "experience_loaded" | "webgl_ready" | "webgl_unavailable";

/** Privacy-safe lifecycle logs for the 3D project. Never accepts visitor data. */
export function capturePixelEvent(event: PixelEvent): void {
  if (!process.env.NEXT_PUBLIC_BETTER_STACK_DSN) return;

  Sentry.withScope((scope) => {
    scope.setTag("area", "pixel-experience");
    scope.setTag("pixel_event", event);
    Sentry.captureMessage(
      `pixel_${event}`,
      event === "webgl_unavailable" ? "warning" : "info",
    );
  });
}
