const RANKING_STEPS = [
  {
    phase: "Collect",
    tool: "X API",
    description: "Searches recent professional conversations and collects at most ten candidates per scheduled scan.",
    why: "A small, recent candidate set keeps paid API usage controlled and favors conversations where timing still matters.",
  },
  {
    phase: "Filter",
    tool: "Rules",
    description: "Rejects Ali’s own posts, reposts, malformed results, duplicates, spam, promotions, and obvious engagement bait.",
    why: "High reach is not useful when the conversation is irrelevant or leaves no credible room to contribute.",
  },
  {
    phase: "Understand",
    tool: "Gemini",
    description: "Scores professional relevance, room to add value, and the author or discussion’s network fit.",
    why: "Semantic judgment distinguishes a useful technical conversation from a post that merely contains matching keywords.",
  },
  {
    phase: "Measure",
    tool: "Metrics",
    description: "Calculates engagement, engagement velocity, and freshness from the public metrics returned by X.",
    why: "A relevant post still needs active reach and enough remaining time for a reply to be noticed.",
  },
  {
    phase: "Rank",
    tool: "Hybrid score",
    description: "Combines every signal into a 0–100 Opportunity Score, then applies minimum relevance and contribution gates.",
    why: "The final order rewards conversations where Ali has something valuable to say and joining can realistically build credibility or network value.",
  },
] as const;

const WEIGHTS = [
  ["Professional relevance", "27%"], ["Ability to add value", "22%"],
  ["Existing engagement", "18%"], ["Engagement velocity", "13%"],
  ["Freshness", "12%"], ["Audience value", "8%"],
] as const;

export function RadarProcessPanel() {
  return <div>
    <h3 className="sr-only">How X opportunities are ranked</h3>
    <ol className="flex flex-col gap-2">
      {RANKING_STEPS.map((step, index) => <li key={step.phase}>
        <details open={index === 0 ? true : undefined} className="group rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[11px] text-neutral-600 group-open:text-accent">{String(index + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{step.phase}</span>
            <span className="shrink-0 rounded bg-panel-raised px-2 py-1 font-mono text-[10px] text-neutral-600 group-open:bg-accent-tint group-open:text-accent">{step.tool}</span>
          </summary>
          <div className="px-3 pb-3"><p className="text-[12px]/[1.45] text-neutral-700">{step.description}</p><p className="mt-1 text-[11px]/[1.45] italic text-neutral-500">Why: {step.why}</p></div>
        </details>
      </li>)}
    </ol>
    <details className="group mt-4 rounded-lg border border-line bg-panel transition-colors duration-150 open:border-accent">
      <summary className="flex cursor-pointer list-none items-center px-3 py-3 [&::-webkit-details-marker]:hidden"><span className="text-[13px] font-semibold text-accent">Opportunity Score weights</span></summary>
      <div className="px-3 pb-3"><dl className="flex flex-col gap-2">{WEIGHTS.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-[11px]"><dt className="text-neutral-600">{label}</dt><dd className="font-mono font-semibold text-ink">{value}</dd></div>)}</dl></div>
    </details>
  </div>;
}
