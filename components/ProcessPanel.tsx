import { PROCESS_STEPS, TECH_STACK } from "@/lib/site";

export function ProcessPanel() {
  return (
    <div>
      <h3 className="sr-only">How this site was built</h3>
      <ol className="flex flex-col gap-2">
        {PROCESS_STEPS.slice(0, 5).map((step, index) => (
          <li key={step.phase}>
            <details
              open={index === 0 ? true : undefined}
              className="group rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-[11px] text-neutral-600 group-open:text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{step.phase}</span>
                <span className="shrink-0 rounded bg-panel-raised px-2 py-1 font-mono text-[10px] text-neutral-600 group-open:bg-accent-tint group-open:text-accent">
                  {step.tool}
                </span>
              </summary>
              <div className="px-3 pb-3">
                <p className="text-[12px]/[1.45] text-neutral-700">{step.description}</p>
                <p className="mt-1 text-[11px]/[1.45] italic text-neutral-500">
                  Why: {step.why}
                </p>
              </div>
            </details>
          </li>
        ))}
      </ol>
      <section
        aria-labelledby="tech-stack-title"
        className="mt-4 rounded-lg border border-line bg-panel px-3 py-3"
      >
        <h4 id="tech-stack-title" className="text-[13px] font-semibold text-ink">
          Tech stack
        </h4>
        <dl className="mt-3 flex flex-col gap-3">
          {TECH_STACK.map((item) => (
            <div key={item.area}>
              <dt className="text-[12px] font-semibold text-ink">{item.area}</dt>
              <dd className="mt-0.5 text-[11px]/[1.45] text-neutral-600">
                <span className="text-neutral-700">{item.tools}</span> — {item.why}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
