const RANKING_STEPS = [
  {
    phase: "Collect",
    tool: "Official X API",
    description: "Searches recent public, English, original posts across AI tools, software, Git, SaaS, building, and product-platform discussions. The query favors direct questions, debatable positions, switching decisions, friction, and fast-changing claims.",
    why: "Retrieval uses only the documented X API—never scraping or browser automation—and asks for the minimum public fields required to rank and render a compliant post.",
  },
  {
    phase: "Minimize",
    tool: "Validation",
    description: "Rejects replies, reposts, quote posts, article posts, paid nullcasts, link-heavy posts, malformed records, missing display attribution, Ali’s own posts, and post IDs covered by a removal request.",
    why: "The product keeps only data needed for this narrow owner tool and never accesses protected posts, Direct Messages, private metrics, location, or sensitive inferred attributes.",
  },
  {
    phase: "Understand",
    tool: "Local ranker",
    description: "Scores personal topic fit, whether the post creates a real conversational opening, and brevity. The profile favors concise questions, grounded disagreements, product-switching decisions, builder trade-offs, developer workflows, and social-product debates.",
    why: "All analysis runs locally. X Content is not sent to an external AI provider and is never used to train or fine-tune a model.",
  },
  {
    phase: "Measure",
    tool: "Public metrics",
    description: "Measures reply momentum, replies relative to public views, and reach. Likes, reposts, quotes, and bookmarks remain visible context but cannot substitute for an active conversation.",
    why: "The target is a useful exchange, so replies and their pace matter more than passive popularity or follower authority.",
  },
  {
    phase: "Filter",
    tool: "Quality gates",
    description: "Requires topic fit, a strong opening, at least three public replies, enough overall opportunity score, and either concise text or exceptional momentum. Only the six best qualifying conversations are returned; Skip results are withheld.",
    why: "Returning nothing is better than filling the page with long, quiet, weakly matched posts. Long form earns an exception only when reply activity and reach are genuinely exceptional.",
  },
  {
    phase: "Display",
    tool: "X attribution",
    description: "Renders the full unmodified post text with linked entities, author avatar, display name, @username, timestamp, official X mark, public metrics, and a titled X permalink.",
    why: "The custom rendering follows X’s display requirements. The optional Suggest reply control only copies a local writing brief; it never calls an AI provider or posts, likes, reposts, follows, or shares anything on X.",
  },
  {
    phase: "Expire",
    tool: "Railway volume",
    description: "Caches only the latest qualifying snapshot, scan counters, and a content-free last-scan timestamp. An independent timer removes X Content within 24 hours at the absolute latest, while that timestamp preserves the 10-day scan cadence after expiry.",
    why: "Short retention minimizes stored X Content and bounds how long a deletion, protection change, suspension, withholding, or edit could remain visible between official API refreshes.",
  },
  {
    phase: "Remove",
    tool: "Owner purge",
    description: "A protected backend action immediately removes a requested post from the snapshot and stores only a one-way hash so the same post cannot reappear in later scans.",
    why: "Account-owner and X removal requests can be honored promptly without retaining the removed post text, author profile, or recoverable identifier.",
  },
  {
    phase: "Observe",
    tool: "Better Stack",
    description: "Records only scan success, safe counts, duration, and failure category. Logs never contain post text, post or author identifiers, credentials, owner tokens, or visitor data.",
    why: "The system remains diagnosable without redistributing or leaking X Content through monitoring.",
  },
] as const;

const WEIGHTS = [
  ["Personal fit", "22%"], ["Conversation opening", "22%"],
  ["Reply momentum", "22%"], ["Reply density", "14%"],
  ["Brevity", "12%"], ["View reach", "8%"],
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
