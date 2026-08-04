"use client";

import { X } from "lucide-react";
import type { TraceStep } from "@/lib/agent-types";
import { LiveTrace } from "./LiveTrace";
import { ProcessPanel } from "./ProcessPanel";

export type PanelTab = "live" | "process";

type Props = {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  steps: TraceStep[];
  running: boolean;
  /** Below `lg` the panel is an overlay drawer instead of a third column. */
  open: boolean;
  onClose: () => void;
};

const TABS: { id: PanelTab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "process", label: "Process" },
];

export function RightPanel({ tab, onTabChange, steps, running, open, onClose }: Props) {
  return (
    <>
      {open && (
        // Backdrop only — the labelled close button below is the accessible path.
        <div aria-hidden onClick={onClose} className="fixed inset-0 z-20 bg-ink/20 lg:hidden" />
      )}
      <aside
        aria-label="Agent panel"
        className={[
          "fixed inset-y-0 right-0 z-30 flex w-[360px] max-w-[88vw] flex-col gap-5 overflow-auto border-l border-line bg-bg p-6 transition-transform duration-200 ease-out",
          "lg:visible lg:static lg:z-auto lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          open ? "visible translate-x-0 shadow-xl" : "invisible translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Panel view"
            className="inline-flex self-start overflow-hidden rounded-[9px] border border-line-strong"
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`panel-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls="panel-body"
                  onClick={() => onTabChange(t.id)}
                  className={[
                    "px-4 py-[7px] text-[13px] font-semibold transition-colors duration-150 ease-out",
                    active
                      ? "bg-accent text-white"
                      : "text-neutral-700 hover:bg-[rgb(32_30_29_/_0.04)] hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex size-8 items-center justify-center rounded-lg text-neutral-700 transition-[transform,color,background-color] duration-150 ease-out hover:scale-105 hover:bg-[rgb(32_30_29_/_0.05)] hover:text-ink active:scale-95 lg:hidden"
          >
            <X size={17} strokeWidth={1.6} aria-hidden />
          </button>
        </div>

        <div
          id="panel-body"
          role="tabpanel"
          aria-labelledby={`panel-tab-${tab}`}
          className="flex flex-col gap-5"
        >
          {tab === "live" ? <LiveTrace steps={steps} running={running} /> : <ProcessPanel />}
        </div>
      </aside>
    </>
  );
}
