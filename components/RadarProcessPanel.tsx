const RANKING_STEPS = [
  {
    phase: "Collect",
    tool: "X API",
    description: "Every scheduled and owner scan uses the same X search for the best active posts from the previous 12 hours: reply-worthy AI and software questions, AI-tool friction, builder-versus-distribution trade-offs, source-control debates, capability claims, launches, and outages.",
    why: "Representative posts tune reusable topic patterns rather than creating an allowlist. Discussion-style matches must be link-free, while launches and outages can include links; a narrow quote-reaction branch covers high-activity timing discussions.",
  },
  {
    phase: "Validate",
    tool: "Rules",
    description: "Removes Ali’s own posts, reposts, and malformed results before scoring; posts from an earlier scan can appear again when they remain among the best current matches.",
    why: "Every valid candidate returned by the paid search is ranked, while the score downranks long notes, articles, generic tool-choice polls, spam, promotions, and engagement bait without another paid X request.",
  },
  {
    phase: "Understand",
    tool: "Local analysis",
    description: "Scores professional relevance and room to add value across practical questions, builder trade-offs, AI-tool constraints, consequential capability claims, and technical events. Author authority uses follower scale, verification, and average posting activity; quoted sources provide same-response context.",
    why: "X content stays inside the application by default. Gemini inference is available only after the disclosed processing is approved and paid-service data terms are confirmed.",
  },
  {
    phase: "Measure",
    tool: "Metrics",
    description: "Scores replies and quote posts most strongly, followed by reposts, bookmarks, and likes, plus how quickly those interactions accumulated. Views remain a separate, lower-weight reach signal.",
    why: "Real participation matters more than passive exposure. Freshness is not scored because every candidate already comes from the configured 12-hour window.",
  },
  {
    phase: "Rank",
    tool: "Hybrid score",
    description: "Combines every signal into a 0–100 Opportunity Score and orders all candidates from strongest to weakest.",
    why: "Scores of 70+ fit Ali best, 55–69 warrant judgment, and lower scores are easy to skip. Interactions and their velocity dominate, while professional relevance and author quality prevent empty virality from winning.",
  },
  {
    phase: "Cache",
    tool: "Railway volume",
    description: "Writes only the latest successful snapshot and usage counter to the persistent /data volume; page visits read that cache and never call X.",
    why: "A server environment variable controls the scan cadence without a code change. One Railway replica owns that scheduler and its concurrency lock, preventing duplicate paid scans.",
  },
  {
    phase: "Observe",
    tool: "Better Stack",
    description: "Records whether each scan completed, returned zero matches, or failed, together with safe result counts and duration; Railway receives the same structured lifecycle log.",
    why: "Diagnostics never include post text, post or author IDs, API credentials, owner tokens, or visitor data, but they make an unexpectedly empty scan traceable.",
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
    description: "Provides clearly labeled, clickable actions to open the post or copy a concise, context-rich reply prompt built from the cached post, quoted-source context when present, its metrics, and Ali’s observed professional voice.",
    why: "The prompt favors a direct position, one concrete reason, and a balanced trade-off without inventing experience or forcing a question. It asks ChatGPT to inspect live discussion context, while the portfolio makes no additional X request and never auto-posts.",
  },
] as const;

const WEIGHTS = [
  ["Existing interactions", "32%"], ["Interaction velocity", "28%"],
  ["Professional relevance", "15%"], ["Author authority", "10%"],
  ["View reach", "8%"], ["Ability to add value", "7%"],
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
