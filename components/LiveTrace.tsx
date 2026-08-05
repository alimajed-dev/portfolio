"use client";

import { Check, X } from "lucide-react";
import type { TraceStep } from "@/lib/agent-types";
import { initialSteps } from "@/lib/pipeline-plan";

const IDLE_STEPS = initialSteps();

function StepIcon({ status }: { status: TraceStep["status"] }) {
  switch (status) {
    case "done":
      return (
        <span
          data-step-status="done"
          className="flex size-[18px] shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white"
        >
          <Check size={10} strokeWidth={3} aria-hidden />
        </span>
      );
    case "running":
      return (
        <span
          data-step-status="running"
          className="size-[18px] shrink-0 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"
          aria-hidden
        />
      );
    case "error":
      return (
        <span className="flex size-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-neutral-400 text-neutral-700">
          <X size={10} strokeWidth={3} aria-hidden />
        </span>
      );
    default:
      return <span className="size-[18px] shrink-0 rounded-md border-[1.5px] border-neutral-400" aria-hidden />;
  }
}

const STATUS_LABEL: Record<TraceStep["status"], string> = {
  pending: "pending",
  running: "in progress",
  done: "done",
  error: "failed",
};

/** One short announcement per change, instead of re-reading the whole list. */
function announcement(steps: TraceStep[], running: boolean): string {
  if (steps.length === 0) return "";
  const active = steps.find((s) => s.status === "running");
  if (active) return `${active.name} running on ${active.model}. ${active.description}.`;
  if (!running) {
    const failed = steps.filter((s) => s.status === "error");
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
    <>
      <h3 className="text-[11px] font-semibold tracking-[0.07em] text-neutral-600">Agent trace</h3>

      {idle && (
        <p className="-mt-2 text-[13px]/[1.5] text-ink/[0.65]">
          Send a message and the four agents below run for real — each step updates here as it
          happens.
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement(steps, running)}
      </p>

      <ol className="flex flex-col" aria-busy={running}>
        {shown.map((step, index) => (
          <li
            key={step.id}
            className={[
              "py-3.5",
              index < shown.length - 1 ? "border-b border-line-soft" : "",
              // Dimmed, but kept above the 4.5:1 contrast floor the mockup's 0.45 missed.
              step.status === "pending" ? "opacity-60" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              <StepIcon status={step.status} />
              <span className="flex-1 text-sm font-semibold">{step.name}</span>
              <span
                className={[
                  "inline-flex shrink-0 items-center rounded-md px-2.5 py-[3px] text-[11px]",
                  step.status === "running"
                    ? "bg-orange-50 text-orange-800"
                    : "bg-badge text-neutral-800",
                ].join(" ")}
              >
                {step.model}
              </span>
            </div>
            <p className="mt-1.5 ml-7 text-[13px] text-ink/[0.85]">{step.description}</p>
            <p className="mt-0.5 ml-7 text-[11px] text-neutral-600 italic">
              Why this model: {step.reason}
            </p>
            <span className="sr-only">Status: {STATUS_LABEL[step.status]}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
