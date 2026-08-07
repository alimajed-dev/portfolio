import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_BETTER_STACK_DSN;

function stripQuery(value: string): string {
  try {
    const url = new URL(value, "https://majedali.com");
    return value.startsWith("http") ? `${url.origin}${url.pathname}` : url.pathname;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

/**
 * Error reports should explain where the app failed without copying visitor
 * input, model prompts, response bodies, cookies, or identifying headers.
 */
export function scrubMonitoringEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;

  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url ? stripQuery(event.request.url) : undefined,
    };
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubMonitoringBreadcrumb)
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null);
  }

  return event;
}

export function scrubMonitoringBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category?.startsWith("console") || breadcrumb.category?.startsWith("ui.")) {
    return null;
  }

  const safe: Breadcrumb = {
    category: breadcrumb.category,
    level: breadcrumb.level,
    timestamp: breadcrumb.timestamp,
    type: breadcrumb.type,
  };

  if (breadcrumb.data) {
    const url = typeof breadcrumb.data.url === "string" ? stripQuery(breadcrumb.data.url) : undefined;
    const from =
      typeof breadcrumb.data.from === "string" ? stripQuery(breadcrumb.data.from) : undefined;
    const to = typeof breadcrumb.data.to === "string" ? stripQuery(breadcrumb.data.to) : undefined;
    const method =
      typeof breadcrumb.data.method === "string" ? breadcrumb.data.method : undefined;
    const statusCode =
      typeof breadcrumb.data.status_code === "number" ? breadcrumb.data.status_code : undefined;

    safe.data = { url, from, to, method, status_code: statusCode };
  }

  return safe;
}

export const monitoringOptions = {
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  sampleRate: 1,
  tracesSampleRate: 0,
  enableLogs: false,
  sendDefaultPii: false,
  beforeSend: scrubMonitoringEvent,
  beforeBreadcrumb: scrubMonitoringBreadcrumb,
};
