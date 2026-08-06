"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TraceStep } from "@/lib/agent-types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { LiveTrace } from "./LiveTrace";
import { ProcessPanel } from "./ProcessPanel";

export type PanelTab = "live" | "process";

type Props = {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  steps: TraceStep[];
  running: boolean;
  open: boolean;
  onClose: () => void;
};

const TABS: { id: PanelTab; label: string; mobileLabel: string }[] = [
  { id: "live", label: "Live", mobileLabel: "Live" },
  { id: "process", label: "Step by step", mobileLabel: "Process" },
];

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function RightPanel({ tab, onTabChange, steps, running, open, onClose }: Props) {
  const asideRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isDrawer = useMediaQuery("(max-width: 1023px)");
  const modal = open && isDrawer;

  useEffect(() => {
    if (!modal) return;

    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !asideRef.current) return;
      const focusable = Array.from(asideRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = asideRef.current.contains(document.activeElement);
      const atEdge = document.activeElement === (event.shiftKey ? first : last);
      if (atEdge || !inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [modal]);

  return (
    <>
      {open && <div aria-hidden onClick={onClose} className="fixed inset-0 z-20 bg-black/70 lg:hidden" />}
      <aside
        ref={asideRef}
        aria-label="Agent panel"
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        className={[
          "fixed inset-y-0 right-0 z-30 flex w-[340px] max-w-[87vw] flex-col border-l border-line bg-surface transition-transform duration-200 ease-out",
          "lg:visible lg:static lg:z-auto lg:w-[360px] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          open ? "visible translate-x-0 shadow-2xl" : "invisible translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4 lg:h-[46px] lg:px-0">
          <p className="text-base font-semibold text-ink lg:hidden">
            {tab === "live" ? "Agent trace" : "How built"}
          </p>
          <div
            role="tablist"
            aria-label="Panel view"
            className="flex items-center lg:h-full lg:flex-1"
          >
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`panel-tab-${item.id}`}
                  aria-label={item.label}
                  aria-selected={active}
                  aria-controls="panel-body"
                  onClick={() =>
                    onTabChange(isDrawer && active ? (item.id === "live" ? "process" : "live") : item.id)
                  }
                  title={isDrawer && active ? `Switch to ${item.id === "live" ? "Process" : "Live"}` : undefined}
                  className={[
                    "text-xs font-medium transition-[background-color,color,border-color] duration-150",
                    "lg:flex lg:h-full lg:flex-1 lg:items-center lg:justify-center lg:border-b",
                    active
                      ? "rounded bg-accent-tint px-2 py-1 text-accent lg:rounded-none lg:border-accent lg:bg-transparent lg:px-0 lg:py-0"
                      : "sr-only text-neutral-600 lg:not-sr-only lg:border-transparent lg:hover:bg-white/[0.03] lg:hover:text-ink",
                  ].join(" ")}
                >
                  <span aria-hidden className="lg:hidden">{item.mobileLabel}</span>
                  <span aria-hidden className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="ml-auto flex size-8 items-center justify-center rounded-md text-neutral-600 transition-[background-color,color,transform] duration-150 hover:scale-105 hover:bg-white/[0.05] hover:text-ink active:scale-95 lg:hidden"
          >
            <X size={17} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div
          id="panel-body"
          role="tabpanel"
          aria-labelledby={`panel-tab-${tab}`}
          className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"
        >
          {tab === "live" ? <LiveTrace steps={steps} running={running} /> : <ProcessPanel />}
        </div>
      </aside>
    </>
  );
}
