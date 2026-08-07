"use client";

import { Check, Clock3, RefreshCw, X } from "lucide-react";
import type { TraceStep } from "@/lib/agent-types";
import { initialSteps } from "@/lib/pipeline-plan";

const IDLE_STEPS = initialSteps();

function StepIcon({ status }: { status: TraceStep["status"] }) {
  switch (status) {
    case "done":
      return (
        <span data-step-status="done" className="flex size-4 shrink-0 items-center justify-center rounded-full border border-success text-success">
          <Check size={10} strokeWidth={2.8} aria-hidden />
        </span>
      );
    case "running":
      return (
        <RefreshCw
          data-step-status="running"
          size={16}
          strokeWidth={2}
          className="shrink-0 animate-spin text-warning"
          aria-hidden
        />
      );
    case "error":
      return (
        <span data-step-status="error" className="flex size-4 shrink-0 items-center justify-center rounded-full border border-error text-error">
          <X size={9} strokeWidth={2.5} aria-hidden />
        </span>
      );
    default:
      return <Clock3 data-step-status="pending" size={16} strokeWidth={1.7} className="shrink-0 text-neutral-500" aria-hidden />;
  }
}

const STATUS_LABEL: Record<TraceStep["status"], string> = {
  pending: "pending",
  running: "in progress",
  done: "done",
  error: "failed",
};

function announcement(steps: TraceStep[], running: boolean): string {
  if (steps.length === 0) return "";
  const active = steps.find((step) => step.status === "running");
  if (active) return `${active.name} running on ${active.model}. ${active.description}.`;
  if (!running) {
    const failed = steps.filter((step) => step.status === "error");
    return failed.length > 0
      ? `Agent run finished with ${failed.length} failed step${failed.length === 1 ? "" : "s"}.`
      : "Agent run complete.";
  }
  return "";
}

export function LiveTrace({ steps, running }: { steps: TraceStep[]; running: boolean }) {
  const idle = steps.length === 0;
  const shown = idle ? IDLE_STEPS : steps;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Agent trace</h3>
      <p className="mt-1 text-[11px]/[1.4] text-neutral-600">
        {idle
          ? "Send a message and the four agents below run for real — each step updates here as it happens."
          : "Each step in the pipeline updates instantly as agents collaborate."}
      </p>

      <p className="sr-only" role="status" aria-live="polite">{announcement(steps, running)}</p>

      <ol className="mt-4 flex flex-col gap-2" aria-busy={running}>
        {shown.map((step) => {
          const pendingText = idle ? "Awaiting pipeline activation" : "Awaiting preceding pipeline tasks";
          return (
            <li
              key={step.id}
              className={[
                "rounded-lg border bg-panel p-3 transition-[border-color,background-color,opacity] duration-200",
                step.status === "running"
                  ? "border-warning"
                  : step.status === "done"
                    ? "border-line"
                    : step.status === "error"
                      ? "border-error/50"
                      : "border-line",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <StepIcon status={step.status} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{step.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-neutral-600">{step.model}</span>
              </div>
              <p className="mt-2 text-[12px]/[1.4] text-ink">
                {step.status === "pending" ? pendingText : step.description}
              </p>
              {step.status !== "pending" && (
                <p className="mt-1 text-[11px]/[1.4] italic text-neutral-500">
                  Why this model: {step.reason}
                </p>
              )}
              <span className="sr-only">Status: {STATUS_LABEL[step.status]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
