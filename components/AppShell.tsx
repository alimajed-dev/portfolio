"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AgentRunContextProvider } from "@/lib/agent-run-context";
import { RightPanel, type PanelTab } from "./RightPanel";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { trackPageView } from "@/lib/analytics";
import { PROJECTS } from "@/lib/site";
import { useAgentRun } from "@/lib/useAgentRun";
import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * Mounted once, at the root layout, wrapping every route. `children` is
 * whichever page Next.js's router selected (home, contact, or a project) —
 * this shell itself no longer decides that. It stays mounted across
 * navigations, which is what keeps the agent run, sidebar collapse state, and
 * panel state alive as the visitor moves between real, shareable URLs.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tab, setTab] = useState<PanelTab>("live");
  const [panelOpen, setPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { messages, steps, running, send } = useAgentRun();

  const isNarrow = useMediaQuery("(max-width: 1023px)");
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? false;

  const activeProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const project = activeProjectId ? PROJECTS.find((p) => p.id === activeProjectId) : undefined;

  // GA's base snippet already reports whichever URL the visitor actually
  // landed on, so only report *changes* after mount — otherwise the first
  // route is counted twice.
  const trackedInitialView = useRef(false);
  useEffect(() => {
    if (!trackedInitialView.current) {
      trackedInitialView.current = true;
      return;
    }
    trackPageView(pathname);
  }, [pathname]);

  // Resetting state when a prop (here, the route) changes belongs in render,
  // not an effect — an effect would render once with the stale value, then
  // schedule a second render to fix it. See "Adjusting state when a prop
  // changes" in the React docs.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    // Every navigation closes the mobile drawer, whatever it was showing.
    setPanelOpen(false);
    setSidebarOpen(false);
  }

  // Live is the documented default for a project's panel. Keyed on the project
  // id rather than the raw pathname so switching panel tabs within one
  // project doesn't re-trigger this — only *entering* a project (including
  // switching from one project straight into another) does.
  const [prevProjectId, setPrevProjectId] = useState(activeProjectId);
  if (prevProjectId !== activeProjectId) {
    setPrevProjectId(activeProjectId);
    if (activeProjectId) setTab("live");
  }

  useEffect(() => {
    if (!panelOpen && !sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, sidebarOpen]);

  // Below `lg` open drawers are modal overlays, so everything behind them must
  // leave the tab order and the accessibility tree.
  const backgroundInert = isNarrow && (panelOpen || sidebarOpen);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg shadow-frame">
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsedOverride(!collapsed)}
          inert={backgroundInert}
        />
      </div>

      {sidebarOpen && (
        <>
          <div
            aria-hidden
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-30 w-[264px] max-w-[86vw] lg:hidden">
            <Sidebar
              collapsed={false}
              onToggleCollapsed={() => setSidebarOpen(false)}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      <main inert={backgroundInert} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <AgentRunContextProvider
          value={{ messages, running, send, openPanel: () => setPanelOpen(true) }}
        >
          {children}
        </AgentRunContextProvider>
      </main>

      {/* Right panel exists only for project routes. */}
      {project && (
        <RightPanel
          tab={tab}
          onTabChange={setTab}
          steps={steps}
          running={running}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}
