const RANKING_STEPS = [
  {
    phase: "Collect",
    tool: "X API",
    description: "Searches the previous 12 hours for active AI and software-engineering debates, developer pain, build-versus-dependency trade-offs, launches, outages, incidents, product announcements, and controversial professional opinions, with a preference for concise posts.",
    why: "Discussion-style matches must be link-free, while launches, releases, outages, and incidents can still include links. Long notes, articles, generic tool-choice polls, and listicles are downranked without another paid X request.",
  },
  {
    phase: "Validate",
    tool: "Rules",
    description: "Removes Ali’s own posts, reposts, malformed results, and duplicates before scoring; low-value candidates remain visible.",
    why: "Every valid candidate is shown, while the score makes spam, promotions, and engagement bait easy to skip.",
  },
  {
    phase: "Deduplicate",
    tool: "Seen-ID cache",
    description: "Excludes post IDs returned within the previous 24 hours, including the currently displayed snapshot.",
    why: "Each paid refresh prioritizes new conversations without making extra X requests solely to replace repeats; the short-lived ID cache expires automatically.",
  },
  {
    phase: "Understand",
    tool: "Local analysis",
    description: "Scores professional relevance, room to add value, author authority, and whether a concise reply can add something distinct without restating a long post.",
    why: "X content stays inside the application by default. Gemini inference is available only after the disclosed processing is approved and paid-service data terms are confirmed.",
  },
  {
    phase: "Measure",
    tool: "Metrics",
    description: "Scores public views, interaction quality, activity velocity, and freshness from the metrics returned by X.",
    why: "Views and interactions are the dominant criteria because a relevant post still needs real distribution and active participation.",
  },
  {
    phase: "Rank",
    tool: "Hybrid score",
    description: "Combines every signal into a 0–100 Opportunity Score and orders all candidates from strongest to weakest.",
    why: "Scores of 70+ fit Ali best, 55–69 warrant judgment, and lower scores are easy to skip. Views and interactions dominate, while a quality floor prevents irrelevant virality from being recommended.",
  },
  {
    phase: "Cache",
    tool: "Railway volume",
    description: "Writes only the latest successful snapshot and usage counter to the persistent /data volume; page visits read that cache and never call X.",
    why: "A server environment variable controls the scan cadence without a code change. One Railway replica owns that scheduler and its concurrency lock, preventing duplicate paid scans.",
  },
  {
    phase: "Owner scan",
    tool: "Secure backend",
    description: "Allows the owner to request an immediate scan and restart the configured countdown through a protected server workflow.",
    why: "Owner authorization and server-enforced usage controls keep the paid action private and spending bounded.",
  },
  {
    phase: "Reply prep",
    tool: "Clipboard prompt",
    description: "Provides clearly labeled, clickable actions to open the post or copy a concise, context-rich reply prompt built from the cached post, its metrics, and Ali’s professional voice.",
    why: "The prompt asks ChatGPT to inspect live replies and quote posts before drafting, so the portfolio makes no additional X request and never auto-posts.",
  },
] as const;

const WEIGHTS = [
  ["View reach", "32%"], ["Existing interactions", "28%"],
  ["Interaction velocity", "15%"], ["Professional relevance", "10%"],
  ["Ability to add value", "7%"], ["Author authority", "5%"], ["Freshness", "3%"],
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
