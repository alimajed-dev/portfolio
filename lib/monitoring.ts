import "server-only";
import * as Sentry from "@sentry/nextjs";

type OperationalContext = {
  area: "agent-pipeline" | "agent-route" | "x-radar";
  step?: string;
  operation?: string;
  code: string;
};

type RadarScanSummary = {
  kind: "scheduled" | "manual";
  returnedCount: number;
  displayedCount: number;
  opportunityCount: number;
  durationMs: number;
};

/** Report handled failures using only controlled metadata, never provider payloads. */
export function captureOperationalError(error: unknown, context: OperationalContext): void {
  if (!process.env.NEXT_PUBLIC_BETTER_STACK_DSN) return;

  const source = error as { name?: unknown; statusCode?: unknown; status?: unknown };
  const errorName = typeof source?.name === "string" ? source.name : "Error";
  const status =
    typeof source?.statusCode === "number"
      ? source.statusCode
      : typeof source?.status === "number"
        ? source.status
        : undefined;
  const safeError = new Error(`${context.code}${status ? ` (${status})` : ""}`);
  safeError.name = errorName;

  Sentry.withScope((scope) => {
    scope.setTag("area", context.area);
    scope.setTag("error_code", context.code);
    if (context.step) scope.setTag("pipeline_step", context.step);
    if (context.operation) scope.setTag("operation", context.operation);
    if (status) scope.setTag("upstream_status", String(status));
    Sentry.captureException(safeError);
  });
}

/** Record one privacy-safe Better Stack event per paid Radar scan. */
export function captureRadarScan(summary: RadarScanSummary): void {
  if (!process.env.NEXT_PUBLIC_BETTER_STACK_DSN) return;

  const event = summary.returnedCount === 0 ? "scan_empty" : "scan_completed";
  Sentry.withScope((scope) => {
    scope.setTag("area", "x-radar");
    scope.setTag("radar_event", event);
    scope.setTag("scan_kind", summary.kind);
    scope.setTag("returned_count", String(summary.returnedCount));
    scope.setTag("displayed_count", String(summary.displayedCount));
    scope.setTag("opportunity_count", String(summary.opportunityCount));
    scope.setTag("duration_ms", String(summary.durationMs));
    Sentry.captureMessage(`x_radar_${event}`, summary.returnedCount === 0 ? "warning" : "info");
  });
}
