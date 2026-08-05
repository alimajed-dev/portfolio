"use client";

import { PROJECTS } from "./site";

declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * Mirrors the per-route `<title>` set in each page's `metadata` export.
 * Computed rather than read from `document.title`, because that value can lag
 * a tick behind a client-side route change and would race this call.
 */
export function pageTitle(pathname: string): string {
  if (pathname === "/contact") return "Contact";
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  if (projectId) {
    return PROJECTS.find((p) => p.id === projectId)?.name ?? "Project";
  }
  return "Home";
}

/**
 * GA's base snippet reports the *first* load on its own (using whatever path
 * the visitor actually landed on — including a deep link straight into
 * /contact or /projects/<id>). Client-side route changes after that don't
 * reload the script, so each one needs this explicit event. No-ops when GA
 * isn't loaded — every environment without NEXT_PUBLIC_GA_ID, including local
 * dev — so callers don't need to check.
 */
export function trackPageView(pathname: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: pathname,
    page_title: pageTitle(pathname),
    page_location: `${window.location.origin}${pathname}`,
  });
}
