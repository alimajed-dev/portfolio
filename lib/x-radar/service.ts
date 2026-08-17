import { readSnapshot, reserveMonthlyRequest, writeSnapshot } from "./cache";
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
  return post.opportunityScore >= 60 && post.signals.relevance >= 55 && post.signals.abilityToAddValue >= 50;
}

export async function getSnapshot() {
  return readSnapshot();
}

export async function refreshRadar(signal?: AbortSignal): Promise<RadarSnapshot> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const previous = await readSnapshot();
    try {
      if (!(await reserveMonthlyRequest())) throw new Error("Monthly X request guard reached");
      const candidates = await searchRecentPosts(signal);
      const analyses = await analyzePosts(candidates, signal);
      const ranked = candidates.map((post, i) => rank(post, analyses[i]));
      const posts = ranked.filter(isOpportunity).sort((a, b) => b.opportunityScore - a.opportunityScore);
      const snapshot: RadarSnapshot = { posts, lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: ranked.length, rejected: ranked.length - posts.length, opportunities: posts.length } };
      await writeSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (previous) {
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

export function startRadarScheduler() {
  if (globalThis.__xRadarTimer) return;
  const interval = Math.max(1, Number(process.env.X_REFRESH_INTERVAL_HOURS) || 4) * 3_600_000;
  void readSnapshot().then((snapshot) => {
    const elapsed = snapshot ? Date.now() - new Date(snapshot.lastRefreshedAt).getTime() : interval;
    const firstDelay = Math.max(0, interval - elapsed);
    const schedule = () => {
      void refreshRadar().catch((error) => console.error("[x-radar] scheduled scan failed", error));
      globalThis.__xRadarNextRefreshAt = new Date(Date.now() + interval).toISOString();
      globalThis.__xRadarTimer = setTimeout(schedule, interval);
      globalThis.__xRadarTimer.unref?.();
    };
    globalThis.__xRadarNextRefreshAt = new Date(Date.now() + firstDelay).toISOString();
    globalThis.__xRadarTimer = setTimeout(schedule, firstDelay);
    globalThis.__xRadarTimer.unref?.();
  });
}
