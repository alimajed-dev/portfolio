"use client";

import { useEffect, useRef, useState } from "react";
import { RightPanel, type PanelTab } from "./RightPanel";
import { Sidebar } from "./Sidebar";
import { ContactPane } from "./panes/ContactPane";
import { HomePane } from "./panes/HomePane";
import { ProjectPane } from "./panes/ProjectPane";
import { trackPageView, viewToPage } from "@/lib/analytics";
import { PROJECTS } from "@/lib/site";
import { useAgentRun } from "@/lib/useAgentRun";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { View } from "@/lib/view";

export function AppShell() {
  const [view, setView] = useState<View>({ kind: "home" });
  const [tab, setTab] = useState<PanelTab>("live");
  const [panelOpen, setPanelOpen] = useState(false);
  const { messages, steps, running, send } = useAgentRun();

  // Narrow viewports default to a collapsed sidebar; an explicit toggle wins.
  const isNarrow = useMediaQuery("(max-width: 1023px)");
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? isNarrow;

  // GA's own script already reports the initial load, so only report changes
  // after mount — otherwise the first pane is counted twice.
  const trackedInitialView = useRef(false);
  useEffect(() => {
    if (!trackedInitialView.current) {
      trackedInitialView.current = true;
      return;
    }
    trackPageView(viewToPage(view));
  }, [view]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const project =
    view.kind === "project" ? PROJECTS.find((p) => p.id === view.projectId) : undefined;

  const select = (next: View) => {
    setView(next);
    setPanelOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg shadow-frame">
      <Sidebar
        view={view}
        onSelect={select}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsedOverride(!collapsed)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {project ? (
          <ProjectPane
            project={project}
            messages={messages}
            running={running}
            onSend={send}
            onOpenPanel={() => setPanelOpen(true)}
          />
        ) : view.kind === "contact" ? (
          <ContactPane />
        ) : (
          <HomePane onContact={() => select({ kind: "contact" })} />
        )}
      </main>

      {/* Right panel exists only for project views. */}
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
