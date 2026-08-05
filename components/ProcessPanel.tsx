import { ChevronRight } from "lucide-react";
import { PROCESS_STEPS } from "@/lib/site";

export function ProcessPanel() {
  return (
    <>
      <h3 className="text-[11px] font-semibold tracking-[0.07em] text-neutral-600">Case study</h3>
      <ol className="flex flex-col">
        {PROCESS_STEPS.map((step, index) => (
          <li
            key={step.phase}
            className={`py-3.5 ${index < PROCESS_STEPS.length - 1 ? "border-b border-line-soft" : ""}`}
          >
            <p className="mb-1 text-[10px] font-semibold tracking-[0.09em] text-accent uppercase">
              {step.phase}
            </p>

            <div className="mb-[3px] flex items-center gap-2">
              <span className="flex-1 text-sm font-semibold">{step.tool}</span>
              <span className="inline-flex shrink-0 items-center rounded-md bg-badge px-2.5 py-[3px] text-[11px] text-neutral-800">
                {step.model}
              </span>
            </div>

            <p className="text-[13px] text-ink/[0.72]">{step.description}</p>

            {/* Native disclosure: keyboard-operable and open-by-default for
                search and print, with no client-side state to manage. */}
            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[11px] font-semibold text-neutral-600 transition-colors duration-150 ease-out hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={12}
                  strokeWidth={2.2}
                  aria-hidden
                  className="transition-transform duration-150 ease-out group-open:rotate-90"
                />
                Why
              </summary>
              <p className="mt-2 border-l-2 border-line pl-3 text-[12px]/[1.65] text-ink/[0.68]">
                {step.why}
              </p>
            </details>
          </li>
        ))}
      </ol>
    </>
  );
}
