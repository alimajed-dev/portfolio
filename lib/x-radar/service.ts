import { captureOperationalError, captureRadarScan } from "../monitoring";
import { clearLegacySeenPostCache, readSnapshot, reserveMonthlyRequest, writeSnapshot } from "./cache";
import { analyzePosts } from "./analysis";
import { opportunityScore, scoreLabel } from "./scoring";
import { searchRecentPosts } from "./x-client";
import type { RadarSnapshot, RankedPost, RelevanceAnalysis, XPost } from "./types";

let refreshPromise: Promise<RadarSnapshot> | null = null;

function rank(post: XPost, analysis: RelevanceAnalysis): RankedPost {
  const { score, signals } = opportunityScore(analysis, post.metrics, post.createdAt);
  return { ...post, opportunityScore: score, label: scoreLabel(score), signals, whyReply: analysis.whyReply, suggestedAngle: analysis.suggestedAngle, url: `https://x.com/${post.author.username}/status/${post.id}` };
}

// Reach cannot rescue an irrelevant or shallow post. The score orders only
// candidates that first clear these product-level quality gates.
function isOpportunity(post: RankedPost) {
  return post.opportunityScore >= 55 && post.signals.relevance >= 50 && post.signals.abilityToAddValue >= 45;
}

export async function getSnapshot() {
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  const maxAgeHours = Math.min(24, Math.max(1, Number(process.env.X_CONTENT_MAX_AGE_HOURS) || 24));
  if (Date.now() - new Date(snapshot.lastRefreshedAt).getTime() >= maxAgeHours * 3_600_000) return null;
  return { ...snapshot, posts: snapshot.posts.map((post) => {
    const analysis = { relevance: post.signals.relevance, abilityToAddValue: post.signals.abilityToAddValue, audienceValue: post.signals.audienceValue, whyReply: post.whyReply, suggestedAngle: post.suggestedAngle };
    const { score, signals } = opportunityScore(analysis, post.metrics, post.createdAt);
    return { ...post, opportunityScore: score, label: scoreLabel(score), signals };
  }) };
}

export async function refreshRadar(signal?: AbortSignal, kind: "scheduled" | "manual" = "scheduled"): Promise<RadarSnapshot> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const startedAt = Date.now();
    const previous = await readSnapshot();
    try {
      await clearLegacySeenPostCache();
      const reservation = await reserveMonthlyRequest(kind);
      if (!reservation.ok) throw new Error(reservation.reason === "manual" ? "Monthly manual scan limit reached" : "Monthly X request guard reached");
      const candidates = await searchRecentPosts(signal);
      const analyses = await analyzePosts(candidates, signal);
      const ranked = candidates.map((post, i) => rank(post, analyses[i]));
      const posts = ranked.sort((a, b) => b.opportunityScore - a.opportunityScore);
      const opportunities = posts.filter(isOpportunity).length;
      const warning = posts.length === 0 ? "The latest X search returned no matching posts from the previous 12 hours." : undefined;
      const snapshot: RadarSnapshot = { posts, lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: ranked.length, rejected: ranked.length - opportunities, opportunities }, warning };
      await writeSnapshot(snapshot);
      const summary = { kind, returnedCount: candidates.length, displayedCount: posts.length, opportunityCount: opportunities, durationMs: Date.now() - startedAt };
      console.info("[x-radar] scan completed", summary);
      captureRadarScan(summary);
      return snapshot;
    } catch (error) {
      const source = error as { name?: unknown; statusCode?: unknown; status?: unknown };
      const status = typeof source?.statusCode === "number" ? source.statusCode : typeof source?.status === "number" ? source.status : undefined;
      console.error("[x-radar] scan failed", { kind, durationMs: Date.now() - startedAt, errorName: typeof source?.name === "string" ? source.name : "Error", status });
      captureOperationalError(error, { area: "x-radar", operation: kind, code: "radar_scan_failed" });
      if (previous && kind === "scheduled") {
        const stale = { ...previous, warning: `The latest scheduled scan failed: ${error instanceof Error ? error.message : "Unknown error"}. Showing the last successful results.` };
        await writeSnapshot(stale);
        return stale;
      }
      throw error;
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

declare global {
  var __xRadarTimer: ReturnType<typeof setTimeout> | undefined;
  var __xRadarNextRefreshAt: string | undefined;
}

export function getNextRefreshAt() {
  return globalThis.__xRadarNextRefreshAt;
}

function intervalMs() {
  return Math.max(1, Number(process.env.X_REFRESH_INTERVAL_HOURS) || 4) * 3_600_000;
}

function scheduleAfter(delay: number) {
  if (globalThis.__xRadarTimer) clearTimeout(globalThis.__xRadarTimer);
  globalThis.__xRadarNextRefreshAt = new Date(Date.now() + delay).toISOString();
  globalThis.__xRadarTimer = setTimeout(async () => {
    try { await refreshRadar(); } catch (error) { console.error("[x-radar] scheduled scan failed", error); }
    scheduleAfter(intervalMs());
  }, delay);
  globalThis.__xRadarTimer.unref?.();
}

export async function forceRefreshRadar(signal?: AbortSignal) {
  const snapshot = await refreshRadar(signal, "manual");
  scheduleAfter(intervalMs());
  return snapshot;
}

export function startRadarScheduler() {
  if (globalThis.__xRadarTimer) return;
  const interval = intervalMs();
  void readSnapshot().then((snapshot) => {
    const elapsed = snapshot ? Date.now() - new Date(snapshot.lastRefreshedAt).getTime() : interval;
    const firstDelay = Math.max(0, interval - elapsed);
    scheduleAfter(firstDelay);
  });
}
