"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TraceStep } from "@/lib/agent-types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { LiveTrace } from "./LiveTrace";
import { ProcessPanel } from "./ProcessPanel";
import { PixelProcessPanel } from "./PixelProcessPanel";
import { RadarProcessPanel } from "./RadarProcessPanel";

export type PanelTab = "live" | "process";

type Props = {
  variant?: "agent" | "pixels" | "radar";
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  steps: TraceStep[];
  running: boolean;
  open: boolean;
  onClose: () => void;
};

const TABS: { id: PanelTab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "process", label: "Build Process" },
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

export function RightPanel({ variant = "agent", tab, onTabChange, steps, running, open, onClose }: Props) {
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
        aria-label={variant === "agent" ? "Agent panel" : "Project panel"}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        className={[
          "fixed inset-y-0 right-0 z-30 flex w-[340px] max-w-[87vw] flex-col border-l border-line bg-surface transition-transform duration-200 ease-out",
          "lg:visible lg:static lg:z-auto lg:w-[360px] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          open ? "visible translate-x-0 shadow-2xl" : "invisible translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-[56px] shrink-0 items-center border-b border-line lg:h-[46px]">
          {variant !== "agent" ? (
            <div className="flex h-full min-w-0 flex-1 items-center justify-center border-b border-accent text-xs font-medium text-accent">
              {variant === "radar" ? "Ranking Process" : "Build Process"}
            </div>
          ) : (
            <div
              role="tablist"
              aria-label="Panel view"
              className="flex h-full min-w-0 flex-1 items-center"
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
                  onClick={() => onTabChange(item.id)}
                  className={[
                    "flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center border-b text-xs font-medium transition-[background-color,color,border-color] duration-150",
                    active
                      ? "border-accent text-accent"
                      : "border-transparent text-neutral-600 hover:bg-panel hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
              })}
            </div>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="mr-3 ml-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-600 transition-[background-color,color,transform] duration-150 hover:scale-105 hover:bg-panel hover:text-ink active:scale-95 lg:hidden"
          >
            <X size={17} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div
          id="panel-body"
          role={variant === "agent" ? "tabpanel" : undefined}
          aria-labelledby={variant === "agent" ? `panel-tab-${tab}` : undefined}
          className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5"
        >
          {variant === "pixels" ? (
            <PixelProcessPanel />
          ) : variant === "radar" ? (
            <RadarProcessPanel />
          ) : tab === "live" ? (
            <LiveTrace steps={steps} running={running} />
          ) : (
            <ProcessPanel />
          )}
        </div>
      </aside>
    </>
  );
}
