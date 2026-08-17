"use client";

import { ArrowUpRight, Clock3, Eye, Heart, Info, MessageCircle, Radar, RefreshCw, Repeat2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { RadarSnapshot, RankedPost } from "@/lib/x-radar/types";

type Sort = "score" | "newest";
type RadarResponse = RadarSnapshot & { manualRefresh?: { enabled: boolean; manualRemaining: number; manualLimit: number } };
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
function age(iso: string) { const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)); return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`; }
function scoreStyle(score: number) { return score >= 70 ? "bg-success/15 text-success" : score >= 55 ? "bg-warning/15 text-warning" : "bg-error/15 text-error"; }
function scoreExplanation(post: RankedPost) {
  const { relevance, abilityToAddValue, audienceValue, freshness, velocity } = post.signals;
  return `Relevance ${relevance} · value ${abilityToAddValue} · audience ${audienceValue} · freshness ${freshness} · activity ${velocity}. Green: 70+, orange: 55–69, red: below 55.`;
}

function countdown(target?: string) {
  if (!target) return "Scheduling next scan…";
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000));
  if (seconds === 0) return "Scanning now…";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `Next scan in ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function Metrics({ post }: { post: RankedPost }) {
  const items = [[MessageCircle, post.metrics.replies, "replies"], [Heart, post.metrics.likes, "likes"], [Repeat2, post.metrics.reposts, "reposts"], ...(post.metrics.impressions === undefined ? [] : [[Eye, post.metrics.impressions, "impressions"]] as const)] as const;
  return <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">{items.map(([Icon, value, label]) => <span key={label} title={label} className="inline-flex items-center gap-1"><Icon size={12} aria-hidden />{compact.format(value)}</span>)}</span>;
}

export function RadarExperience() {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [error, setError] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [ownerToken, setOwnerToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [sort, setSort] = useState<Sort>("score");
  const [, tick] = useState(0);
  useEffect(() => { const controller = new AbortController(); fetch("/api/conversation-radar", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Could not load the radar"); return response.json(); }).then(setData).catch((reason) => { if (reason.name !== "AbortError") setError("The radar is temporarily unavailable. Please try again later."); }); return () => controller.abort(); }, []);
  useEffect(() => { const timer = window.setInterval(() => tick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  const posts = useMemo(() => [...(data?.posts ?? [])].sort((a, b) => sort === "score" ? b.opportunityScore - a.opportunityScore : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [data, sort]);
  const manualLimitReached = data?.manualRefresh?.manualRemaining === 0;

  async function scanNow(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerToken || scanning || manualLimitReached) return;
    setScanning(true);
    setError("");
    try {
      const response = await fetch("/api/conversation-radar/refresh", { method: "POST", headers: { Authorization: `Bearer ${ownerToken}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The manual scan failed.");
      setData(body);
      setShowUnlock(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The manual scan failed.");
    } finally {
      setOwnerToken("");
      setScanning(false);
    }
  }

  return <div className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-7 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl"><span className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-ink"><Radar size={14} aria-hidden />Signal over noise</span><h1 className="text-[30px] font-bold tracking-[-0.025em] text-ink sm:text-[38px]">Find the conversations worth joining.</h1><p className="mt-3 text-[14px]/[1.6] text-neutral-600 sm:text-[15px]/[1.6]">An AI-powered radar for X posts where a useful reply can build visibility, credibility, and a better professional network.</p></div>
        <div className="shrink-0 text-left sm:text-right"><p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent-ink sm:justify-end"><Clock3 size={13} aria-hidden />{countdown(data?.nextRefreshAt)}</p><p className="mt-1 text-xs text-neutral-600">{data?.lastRefreshedAt ? `Last scan ${new Date(data.lastRefreshedAt).toLocaleString()}` : "No completed scans yet"}</p>{data?.manualRefresh?.enabled && <div className="mt-3 sm:flex sm:flex-col sm:items-end"><button type="button" disabled={manualLimitReached || scanning} onClick={() => setShowUnlock((value) => !value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line-strong bg-panel px-3 text-xs font-semibold text-ink transition hover:bg-panel-raised disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} className={scanning ? "animate-spin" : ""} aria-hidden />{manualLimitReached ? "Monthly limit reached" : scanning ? "Scanning…" : "Scan now"}</button><p className="mt-1 text-[10px] text-neutral-500">{data.manualRefresh.manualRemaining}/{data.manualRefresh.manualLimit} manual scans left this month</p>{showUnlock && !manualLimitReached && <form onSubmit={scanNow} className="mt-2 flex w-full max-w-xs gap-2 sm:justify-end"><label className="sr-only" htmlFor="radar-owner-token">Owner refresh token</label><input id="radar-owner-token" type="password" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} autoComplete="off" placeholder="Owner token" className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-2.5 py-2 text-xs text-ink sm:w-40" /><button type="submit" disabled={!ownerToken || scanning} className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-on-accent disabled:opacity-50">Confirm</button></form>}</div>}</div>
      </header>

      <section aria-labelledby="pipeline-title" className="mb-6 rounded-xl border border-line bg-surface p-4"><h2 id="pipeline-title" className="sr-only">How the radar works</h2><div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-700">{["X Search", "Candidate Posts", "Relevance Analysis", "Engagement Analysis", "Opportunity Ranking", "Best Conversations"].map((step, index) => <span key={step} className="contents"><span className="rounded-md bg-panel px-2.5 py-1.5">{step}</span>{index < 5 && <span className="text-accent" aria-hidden>→</span>}</span>)}</div>{data && <p className="mt-3 text-xs text-neutral-600"><strong className="text-ink">{data.stats.scanned}</strong> candidates → <strong className="text-success">{data.posts.filter((post) => post.label === "Check").length}</strong> check → <strong className="text-warning">{data.posts.filter((post) => post.label === "Maybe").length}</strong> maybe → <strong className="text-error">{data.posts.filter((post) => post.label === "Skip").length}</strong> skip</p>}<p className="mt-2 text-[11px] text-neutral-500">Public post data sourced from <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-accent-ink underline decoration-accent/40 underline-offset-2">X</a>. This independent project is not affiliated with or endorsed by X.</p></section>

      {(error || data?.warning) && <p role="status" className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{error || data?.warning}</p>}
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">Latest candidates</h2><label className="flex items-center gap-2 text-xs text-neutral-600">Sort by<select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="rounded-md border border-line-strong bg-panel px-2.5 py-1.5 text-sm text-ink"><option value="score">Opportunity score</option><option value="newest">Newest</option></select></label></div>

      {!data && !error ? <div aria-live="polite" className="flex min-h-56 items-center justify-center rounded-xl border border-line bg-surface text-sm text-neutral-600"><Sparkles className="mr-2 animate-pulse text-accent" size={18} aria-hidden />Reading the latest signals…</div> : posts.length === 0 ? <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center"><p className="font-semibold text-ink">No posts available yet.</p><p className="mt-2 text-sm text-neutral-600">The radar will check again at the next scheduled scan.</p></div> : <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-[104px_150px_minmax(220px,1.3fr)_minmax(220px,1fr)_150px_52px_56px] gap-3 border-b border-line bg-panel px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 xl:grid"><span>Score</span><span>Author</span><span>Post</span><span>Why reply</span><span>Engagement</span><span>Age</span><span>Actions</span></div>
        <ul className="divide-y divide-line">{posts.map((post) => <li key={post.id} className="grid gap-4 p-4 transition-colors hover:bg-panel/50 xl:grid-cols-[104px_150px_minmax(220px,1.3fr)_minmax(220px,1fr)_150px_52px_56px] xl:gap-3">
          <div className="flex items-start gap-1.5"><span className={`inline-flex min-w-14 flex-col items-center rounded-lg px-2 py-1.5 ${scoreStyle(post.opportunityScore)}`}><strong className="text-xl leading-none">{post.opportunityScore}</strong><span className="mt-1 text-[10px] font-semibold">{post.label}</span></span><details className="group max-w-[16rem] text-left"><summary aria-label={`Explain score ${post.opportunityScore} for ${post.author.name}`} className="mt-1 inline-flex size-6 cursor-pointer list-none items-center justify-center rounded-full text-neutral-500 transition hover:bg-panel-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"><Info size={15} aria-hidden /></summary><p className="mt-2 rounded-lg border border-line bg-panel p-2.5 text-[11px]/[1.45] text-neutral-700 shadow-sm xl:w-52">{scoreExplanation(post)}</p></details></div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{post.author.name}</p><p className="truncate text-xs text-neutral-600">@{post.author.username}</p></div>
          <p className="text-[13px]/[1.55] text-neutral-700">{post.text}</p><div><p className="text-[13px]/[1.5] text-neutral-700">{post.whyReply}</p><p className="mt-2 text-[11px]/[1.4] text-accent-ink"><strong>Angle:</strong> {post.suggestedAngle}</p></div><Metrics post={post} /><span className="text-xs font-medium text-neutral-600">{age(post.createdAt)}</span><a href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${post.author.name}'s post on X in a new tab`} title="Open on X" className="inline-flex size-9 items-center justify-center rounded-md bg-accent-tint text-accent transition hover:scale-105 hover:bg-accent hover:text-on-accent active:scale-95"><ArrowUpRight size={17} strokeWidth={1.8} aria-hidden /></a>
        </li>)}</ul>
      </div>}
    </div>
  </div>;
}
