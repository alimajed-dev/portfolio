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
            <p className="mb-[3px] text-sm font-semibold">{step.tool}</p>
            <p className="text-[13px] text-ink/[0.72]">{step.description}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
