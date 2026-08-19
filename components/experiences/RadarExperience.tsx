"use client";

import { Bookmark, Clock3, Eye, Heart, Info, MessageCircle, Quote, Radar, RefreshCw, Repeat2, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RadarSnapshot, RankedPost } from "@/lib/x-radar/types";

type RadarResponse = RadarSnapshot & { manualRefresh?: { enabled: boolean; manualRemaining: number; manualLimit: number } };
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
function age(iso: string) { const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)); return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`; }
function scoreStyle(score: number) { return score >= 70 ? "bg-success/15 text-success" : score >= 55 ? "bg-warning/15 text-warning" : "bg-error/15 text-error"; }
function scoreDetails(post: RankedPost) {
  const { personalFit, conversationOpening, momentum, replyDensity, brevity, reach } = post.signals;
  return [
    ["Personal fit", "22%", `${personalFit}/100 · topics and trade-offs that match Ali’s professional contribution lane`],
    ["Conversation opening", "22%", `${conversationOpening}/100 · ${post.whyReply}`],
    ["Reply momentum", "22%", `${momentum}/100 · ${compact.format(post.metrics.replies)} public replies`],
    ["Reply density", "14%", `${replyDensity}/100 · conversation relative to public reach`],
    ["Brevity", "12%", `${brevity}/100${post.exceptionalTrend ? " · long-form exception earned by exceptional momentum" : ""}`],
    ["View reach", "8%", `${compact.format(post.metrics.impressions ?? 0)} public views · ${reach}/100`],
  ] as const;
}

function formatScanTime(iso: string) {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" };
  try { return new Intl.DateTimeFormat(undefined, options).format(date); }
  catch { return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date); }
}

function XBrandMark() {
  return <svg viewBox="0 0 24 24" aria-label="X" role="img" className="size-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>;
}

function PostText({ post }: { post: RankedPost }) {
  const characters = Array.from(post.text);
  const entities = [...(post.entities ?? [])].filter((item, index, all) => item.start >= 0 && item.end <= characters.length && item.end > item.start && (index === 0 || item.start >= all[index - 1].end));
  if (entities.length === 0) return <>{post.text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const item of entities) {
    if (item.start > cursor) parts.push(characters.slice(cursor, item.start).join(""));
    const original = characters.slice(item.start, item.end).join("");
    parts.push(<a key={`${item.start}-${item.end}`} href={item.href} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline decoration-accent/30 underline-offset-2">{item.kind === "url" ? item.value : original}</a>);
    cursor = item.end;
  }
  if (cursor < characters.length) parts.push(characters.slice(cursor).join(""));
  return <>{parts}</>;
}

function postTimestamp(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function ScoreBreakdown({ post }: { post: RankedPost }) {
  return <><p className="mb-3 text-sm font-semibold text-ink">What drives this score</p><ol className="space-y-2">{scoreDetails(post).map(([label, weight, value], index) => <li key={label} className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2 rounded-md bg-panel px-2.5 py-2"><span className="flex size-6 items-center justify-center rounded-full bg-accent-tint font-mono text-[10px] font-semibold text-accent">{index + 1}</span><span className="min-w-0"><span className="block font-medium text-ink">{label} <span className="font-normal text-neutral-500">({weight})</span></span><span className="mt-0.5 block break-words leading-relaxed text-neutral-600">{value}</span></span></li>)}</ol></>;
}

export function formatRadarCountdown(target?: string, now = Date.now()) {
  if (!target) return "Scheduling next scan…";
  const targetTime = new Date(target).getTime();
  if (!Number.isFinite(targetTime)) return "Scheduling next scan…";
  const seconds = Math.max(0, Math.floor((targetTime - now) / 1000));
  if (seconds === 0) return "Scanning now…";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const dayPrefix = days > 0 ? `${days} day${days === 1 ? "" : "s"} ` : "";
  return `Next scan in ${dayPrefix}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function Metrics({ post }: { post: RankedPost }) {
  const items = [[MessageCircle, post.metrics.replies, "replies"], [Heart, post.metrics.likes, "likes"], [Repeat2, post.metrics.reposts, "reposts"], [Quote, post.metrics.quotes, "quote posts"], [Bookmark, post.metrics.bookmarks ?? 0, "bookmarks"], ...(post.metrics.impressions === undefined ? [] : [[Eye, post.metrics.impressions, "impressions"]] as const)] as const;
  return <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">{items.map(([Icon, value, label]) => <span key={label} title={label} className="inline-flex items-center gap-1"><Icon size={12} aria-hidden />{compact.format(value)}</span>)}</span>;
}

export function RadarExperience() {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [error, setError] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [ownerToken, setOwnerToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);
  useEffect(() => { const controller = new AbortController(); fetch("/api/conversation-radar", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Could not load the radar"); return response.json(); }).then(setData).catch((reason) => { if (reason.name !== "AbortError") setError("The radar is temporarily unavailable. Please try again later."); }); return () => controller.abort(); }, []);
  useEffect(() => { const timer = window.setInterval(() => tick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  const posts = useMemo(() => [...(data?.posts ?? [])].sort((a, b) => b.opportunityScore - a.opportunityScore), [data]);
  const manualLimitReached = data?.manualRefresh?.manualRemaining === 0;

  useEffect(() => {
    if (!showUnlock) return;
    const returnTarget = refreshButtonRef.current;
    tokenInputRef.current?.focus();
    const handleModalKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !scanning) setShowUnlock(false);
      if (event.key !== "Tab" || !modalRef.current) return;
      const controls = Array.from(modalRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleModalKey);
    return () => { window.removeEventListener("keydown", handleModalKey); returnTarget?.focus(); };
  }, [showUnlock, scanning]);

  useEffect(() => {
    if (!expandedScoreId) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpandedScoreId(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expandedScoreId]);

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
        <div className="max-w-2xl"><span className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-ink"><Radar size={14} aria-hidden />Personal signal, not noise</span><h1 className="text-[30px] font-bold tracking-[-0.025em] text-ink sm:text-[38px]">Find the conversations worth joining.</h1><p className="mt-3 text-[14px]/[1.6] text-neutral-600 sm:text-[15px]/[1.6]">A local, personalized filter for concise X conversations with real reply momentum, a clear opening, and room for a practical contribution.</p></div>
        <div className="flex shrink-0 items-start gap-2 text-left sm:text-right"><div><p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent-ink sm:justify-end"><Clock3 size={13} aria-hidden />{formatRadarCountdown(data?.nextRefreshAt)}</p><p className="mt-1 text-xs text-neutral-600">{data?.lastRefreshedAt ? `Last scan ${formatScanTime(data.lastRefreshedAt)}` : "No completed scans yet"}</p></div>{data?.manualRefresh?.enabled && <button ref={refreshButtonRef} type="button" disabled={manualLimitReached || scanning} onClick={() => { setError(""); setShowUnlock(true); }} aria-label={manualLimitReached ? "Monthly manual scan limit reached" : "Run a manual scan"} title={manualLimitReached ? "Monthly manual scan limit reached" : "Run a manual scan"} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-panel text-ink transition hover:scale-105 hover:bg-panel-raised active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={15} className={scanning ? "animate-spin" : ""} aria-hidden /></button>}</div>
      </header>

      {showUnlock && data?.manualRefresh?.enabled && !manualLimitReached && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target && !scanning) setShowUnlock(false); }}><div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="manual-scan-title" className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 text-left shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="manual-scan-title" className="text-lg font-semibold text-ink">Run a manual scan</h2><p className="mt-1 text-xs text-neutral-600">Enter the owner token to make one paid backend request and restart the scheduled timer.</p></div><button type="button" onClick={() => setShowUnlock(false)} disabled={scanning} aria-label="Close manual scan dialog" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-600 transition hover:bg-panel hover:text-ink disabled:opacity-50"><X size={17} aria-hidden /></button></div><div className="my-4 rounded-lg bg-panel px-3 py-2.5"><p className="text-xs font-semibold text-ink">{data.manualRefresh.manualRemaining}/{data.manualRefresh.manualLimit} manual scans left this month</p><p className="mt-1 text-[11px] text-neutral-500">The server enforces this allowance and the overall monthly spending limit.</p></div>{error && <p role="alert" className="mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{error}</p>}<form onSubmit={scanNow} className="space-y-3"><label className="block text-xs font-medium text-ink" htmlFor="radar-owner-token">Owner token</label><input ref={tokenInputRef} id="radar-owner-token" type="password" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} autoComplete="off" placeholder="Enter owner token" className="w-full rounded-md border border-line-strong bg-bg px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" /><button type="submit" disabled={!ownerToken || scanning} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={15} className={scanning ? "animate-spin" : ""} aria-hidden />{scanning ? "Scanning…" : "Confirm scan"}</button></form></div></div>}

      <section aria-labelledby="pipeline-title" className="mb-6 rounded-xl border border-line bg-surface p-4"><h2 id="pipeline-title" className="sr-only">How the radar works</h2><div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-700">{["Official X API", "Broad Recall", "Local Fit", "Reply Momentum", "Quality Gates", "Top Conversations"].map((step, index) => <span key={step} className="contents"><span className="rounded-md bg-panel px-2.5 py-1.5">{step}</span>{index < 5 && <span className="text-accent" aria-hidden>→</span>}</span>)}</div>{data && <p className="mt-3 text-xs text-neutral-600"><strong className="text-ink">{data.stats.scanned}</strong> valid candidates → <strong className="text-success">{data.stats.opportunities}</strong> cleared every quality gate → <strong className="text-neutral-600">{data.stats.rejected}</strong> withheld</p>}<p className="mt-2 text-[11px] text-neutral-500">Public post data is retrieved through the official <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-accent-ink underline decoration-accent/40 underline-offset-2">X</a> API. No scraping, automated engagement, model training, or external AI processing. This independent project is not affiliated with or endorsed by X.</p></section>

      {(error || data?.warning) && <p role="status" className="mb-5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{error || data?.warning}</p>}
      <h2 className="mb-4 text-lg font-semibold text-ink">Best current conversations</h2>

      {!data && !error ? <div aria-live="polite" className="flex min-h-56 items-center justify-center rounded-xl border border-line bg-surface text-sm text-neutral-600"><Sparkles className="mr-2 animate-pulse text-accent" size={18} aria-hidden />Reading the latest signals…</div> : posts.length === 0 ? <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center"><p className="font-semibold text-ink">No conversation cleared the quality gates.</p><p className="mt-2 text-sm text-neutral-600">The filter would rather return nothing than fill the page with weak matches.</p></div> : <div className="rounded-xl border border-line bg-surface">
        <div className="hidden grid-cols-[104px_180px_minmax(360px,1fr)_190px] gap-4 rounded-t-xl border-b border-line bg-panel px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 xl:grid"><span>Fit</span><span>Author</span><span>Post</span><span>Public activity</span></div>
        <ul className="divide-y divide-line">{posts.map((post) => <li key={post.id} className="relative grid items-start gap-4 p-4 transition-colors hover:bg-panel/50 xl:grid-cols-[104px_180px_minmax(360px,1fr)_190px] xl:gap-4">
          <div className="flex items-start gap-1.5"><span className={`inline-flex min-w-14 flex-col items-center justify-center rounded-lg px-2 py-1.5 ${scoreStyle(post.opportunityScore)}`}><strong className="text-xl leading-none">{post.opportunityScore}</strong><span className="mt-0.5 text-[9px] font-semibold opacity-75">/100</span></span><div className="group relative"><button type="button" aria-expanded={expandedScoreId === post.id} aria-controls={`score-details-${post.id}`} aria-label={`Explain score ${post.opportunityScore} for ${post.author.name}`} onClick={() => setExpandedScoreId((current) => current === post.id ? null : post.id)} className="mt-1 inline-flex size-6 items-center justify-center rounded-full text-neutral-500 transition hover:bg-panel-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Info size={15} aria-hidden /></button><div id={`score-details-${post.id}`} role="tooltip" className="invisible absolute left-0 top-8 z-40 hidden w-80 rounded-xl border border-line-strong bg-surface p-3 text-[11px] text-neutral-700 opacity-0 shadow-2xl transition xl:block group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"><ScoreBreakdown post={post} /></div></div></div>
          <a href={`https://x.com/${post.author.username}`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-start gap-2 rounded-md"><span className="size-9 shrink-0 overflow-hidden rounded-full bg-panel-raised">{post.author.profileImageUrl ? <Image src={post.author.profileImageUrl} width={36} height={36} unoptimized alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-xs font-semibold text-neutral-600">{post.author.name.slice(0, 1)}</span>}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{post.author.name}</span><span className="block truncate text-xs text-neutral-600">@{post.author.username}</span></span></a>
          <div className="min-w-0 pr-6"><p className="whitespace-pre-wrap text-[13px]/[1.55] text-neutral-700"><PostText post={post} /></p><p className="mt-3 text-xs text-neutral-600"><a href={post.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-ink underline decoration-accent/30 underline-offset-2">{postTimestamp(post.createdAt)} · View on X</a><span className="ml-2 text-neutral-500">({age(post.createdAt)} ago)</span></p><p className="mt-2 text-[11px]/[1.5] text-neutral-600"><span className="font-semibold text-ink">Contribution angle:</span> {post.suggestedAngle}</p></div>
          <div><Metrics post={post} /></div><a href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${post.author.name}'s post on X`} className="absolute right-4 top-4 text-ink transition hover:text-accent"><XBrandMark /></a>
        </li>)}</ul>
      </div>}
      {expandedScoreId && posts.some((post) => post.id === expandedScoreId) && <div className="fixed inset-0 z-50 flex items-end bg-black/55 xl:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setExpandedScoreId(null); }}><div role="dialog" aria-modal="true" aria-label="Score breakdown" className="max-h-[78vh] w-full overflow-y-auto rounded-t-2xl border border-line-strong bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"><div className="mb-2 flex justify-end"><button type="button" onClick={() => setExpandedScoreId(null)} aria-label="Close score breakdown" className="inline-flex size-8 items-center justify-center rounded-md text-neutral-600 hover:bg-panel"><X size={17} aria-hidden /></button></div><ScoreBreakdown post={posts.find((post) => post.id === expandedScoreId)!} /></div></div>}
    </div>
  </div>;
}
