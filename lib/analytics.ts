"use client";

import type { View } from "./view";
import { PROJECTS } from "./site";

declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

/** The whole site is one route, so panes are reported as virtual pages. */
export function viewToPage(view: View): { path: string; title: string } {
  switch (view.kind) {
    case "contact":
      return { path: "/contact", title: "Contact" };
    case "project": {
      const project = PROJECTS.find((p) => p.id === view.projectId);
      return {
        path: `/projects/${view.projectId}`,
        title: project?.name ?? "Project",
      };
    }
    default:
      return { path: "/", title: "Home" };
  }
}

/**
 * No-ops when GA isn't loaded — which is every environment without
 * NEXT_PUBLIC_GA_ID, including local dev. Callers don't need to check.
 */
export function trackPageView({ path, title }: { path: string; title: string }) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: `${window.location.origin}${path}`,
  });
}
