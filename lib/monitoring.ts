import "server-only";
import * as Sentry from "@sentry/nextjs";

type OperationalContext = {
  area: "agent-pipeline" | "agent-route";
  step?: string;
  code: string;
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
    if (status) scope.setTag("upstream_status", String(status));
    Sentry.captureException(safeError);
  });
}
