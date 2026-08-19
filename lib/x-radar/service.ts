import { captureOperationalError, captureRadarScan } from "../monitoring";
import { blockedRadarPostIds, clearLegacySeenPostCache, deleteSnapshot, radarPostRemovalKey, readLastSuccessfulScanAt, readSnapshot, reserveMonthlyRequest, writeLastSuccessfulScanAt, writeSnapshot } from "./cache";
import { analyzePosts } from "./analysis";
import { opportunityScore, scoreLabel } from "./scoring";
import { searchRecentPosts } from "./x-client";
import { contentMaxAgeHours, refreshIntervalHours } from "./config";
import type { RadarSnapshot, RankedPost, RelevanceAnalysis, XPost } from "./types";

export { contentMaxAgeHours, refreshIntervalHours } from "./config";

let refreshPromise: Promise<RadarSnapshot> | null = null;

function rank(post: XPost, analysis: RelevanceAnalysis): RankedPost {
  const initial = opportunityScore(analysis, post.metrics, post.createdAt);
  const exceptionalTrend = analysis.brevity < 60 && post.metrics.replies >= 40 && initial.signals.momentum >= 80 && initial.signals.reach >= 70;
  const { score, signals } = exceptionalTrend ? opportunityScore({ ...analysis, brevity: 70 }, post.metrics, post.createdAt) : initial;
  const ageHours = Math.max(0.08, (Date.now() - new Date(post.createdAt).getTime()) / 3_600_000);
  const pace = Math.round(post.metrics.replies / ageHours * 10) / 10;
  const whyReply = `${analysis.whyReply} ${post.metrics.replies} replies at about ${pace}/hour${exceptionalTrend ? "; exceptional momentum earns a long-form exception" : ""}.`;
  return { ...post, opportunityScore: score, label: scoreLabel(score), signals, whyReply, suggestedAngle: analysis.suggestedAngle, url: `https://x.com/${post.author.username}/status/${post.id}`, exceptionalTrend };
}

// Reach cannot rescue an irrelevant or shallow post. The score orders only
// candidates that first clear these product-level quality gates.
function isOpportunity(post: RankedPost) {
  return post.opportunityScore >= 65 && post.signals.personalFit >= 60 && post.signals.conversationOpening >= 60 && post.metrics.replies >= 3 && (post.signals.brevity >= 65 || post.exceptionalTrend);
}

export async function getSnapshot() {
  const snapshot = await readSnapshot();
  if (!snapshot) return null;
  const maxAgeHours = contentMaxAgeHours();
  const refreshedAt = new Date(snapshot.lastRefreshedAt).getTime();
  const expired = !Number.isFinite(refreshedAt) || Date.now() - refreshedAt >= maxAgeHours * 3_600_000;
  const legacy = snapshot.posts.some((post) => typeof post.signals?.personalFit !== "number" || typeof post.exceptionalTrend !== "boolean");
  if (expired || legacy) {
    await deleteSnapshot();
    return null;
  }
  return snapshot;
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
      const removals = await blockedRadarPostIds();
      const candidates = (await searchRecentPosts(signal)).filter((post) => !removals.has(radarPostRemovalKey(post.id)));
      const analyses = await analyzePosts(candidates, signal);
      const ranked = candidates.map((post, i) => rank(post, analyses[i]));
      const posts = ranked.filter(isOpportunity).sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 6);
      const opportunities = posts.length;
      const warning = posts.length === 0 ? "The latest X search found no conversations that cleared the personalized quality gates." : undefined;
      const snapshot: RadarSnapshot = { posts, lastRefreshedAt: new Date().toISOString(), source: "x", stats: { scanned: ranked.length, rejected: ranked.length - opportunities, opportunities }, warning };
      await writeSnapshot(snapshot);
      await writeLastSuccessfulScanAt(snapshot.lastRefreshedAt);
      scheduleContentExpiry(snapshot.lastRefreshedAt);
      const summary = { kind, returnedCount: candidates.length, displayedCount: posts.length, opportunityCount: opportunities, durationMs: Date.now() - startedAt };
      console.info("[x-radar] scan completed", summary);
      captureRadarScan(summary);
      return snapshot;
    } catch (error) {
      const source = error as { name?: unknown; statusCode?: unknown; status?: unknown };
      const status = typeof source?.statusCode === "number" ? source.statusCode : typeof source?.status === "number" ? source.status : undefined;
      console.error("[x-radar] scan failed", { kind, durationMs: Date.now() - startedAt, errorName: typeof source?.name === "string" ? source.name : "Error", status });
      captureOperationalError(error, { area: "x-radar", operation: kind, code: "radar_scan_failed" });
      const previousIsFresh = previous && Date.now() - new Date(previous.lastRefreshedAt).getTime() < contentMaxAgeHours() * 3_600_000;
      if (previousIsFresh && kind === "scheduled") {
        const stale = { ...previous, warning: `The latest scheduled scan failed: ${error instanceof Error ? error.message : "Unknown error"}. Showing the last successful results.` };
        await writeSnapshot(stale);
        scheduleContentExpiry(stale.lastRefreshedAt);
        return stale;
      }
      await deleteSnapshot();
      throw error;
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

declare global {
  var __xRadarTimer: ReturnType<typeof setTimeout> | undefined;
  var __xRadarExpiryTimer: ReturnType<typeof setTimeout> | undefined;
  var __xRadarNextRefreshAt: string | undefined;
}

export function getNextRefreshAt() {
  return globalThis.__xRadarNextRefreshAt;
}

function intervalMs() {
  return refreshIntervalHours() * 3_600_000;
}

function scheduleContentExpiry(lastRefreshedAt: string) {
  if (globalThis.__xRadarExpiryTimer) clearTimeout(globalThis.__xRadarExpiryTimer);
  const expiresAt = new Date(lastRefreshedAt).getTime() + contentMaxAgeHours() * 3_600_000;
  const delay = Math.max(0, expiresAt - Date.now());
  globalThis.__xRadarExpiryTimer = setTimeout(() => {
    globalThis.__xRadarExpiryTimer = undefined;
    void readSnapshot().then(async (snapshot) => {
      if (snapshot?.lastRefreshedAt === lastRefreshedAt) await deleteSnapshot();
    }).catch((error) => {
      captureOperationalError(error, { area: "x-radar", operation: "expiry", code: "radar_expiry_failed" });
    });
  }, delay);
  globalThis.__xRadarExpiryTimer.unref?.();
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
  void Promise.all([readSnapshot(), readLastSuccessfulScanAt()]).then(async ([storedSnapshot, storedScanAt]) => {
    const snapshotTime = storedSnapshot ? new Date(storedSnapshot.lastRefreshedAt).getTime() : Number.NaN;
    const lastSuccessfulScanAt = storedScanAt ?? (Number.isFinite(snapshotTime) ? storedSnapshot!.lastRefreshedAt : null);
    if (!storedScanAt && lastSuccessfulScanAt) await writeLastSuccessfulScanAt(lastSuccessfulScanAt);
    const displayableSnapshot = await getSnapshot();
    if (displayableSnapshot) scheduleContentExpiry(displayableSnapshot.lastRefreshedAt);
    const elapsed = lastSuccessfulScanAt ? Date.now() - new Date(lastSuccessfulScanAt).getTime() : interval;
    const firstDelay = Math.max(0, interval - elapsed);
    scheduleAfter(firstDelay);
  }).catch((error) => {
    captureOperationalError(error, { area: "x-radar", operation: "scheduler_start", code: "radar_scheduler_start_failed" });
    scheduleAfter(interval);
  });
}
