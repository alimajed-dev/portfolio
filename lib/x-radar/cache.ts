import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { manualMonthlyRequestLimit, monthlyRequestLimit } from "./config";
import type { RadarSnapshot } from "./types";

const directory = process.env.X_RADAR_DATA_DIR || path.join(process.cwd(), ".data");
const cachePath = path.join(directory, "x-radar.json");
const usagePath = path.join(directory, "x-radar-usage.json");
const seenPath = path.join(directory, "x-radar-seen.json");
const removalsPath = path.join(directory, "x-radar-removals.json");
const schedulePath = path.join(directory, "x-radar-schedule.json");

function removalKey(postId: string) {
  return createHash("sha256").update(`x-radar-removal:${postId}`).digest("hex");
}

async function safeUnlink(target: string) {
  try { await unlink(target); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

export async function getRadarUsage() {
  const month = new Date().toISOString().slice(0, 7);
  let usage: { month: string; count: number; manualCount?: number } = { month, count: 0, manualCount: 0 };
  try { usage = JSON.parse(await readFile(usagePath, "utf8")); } catch {}
  const manualCount = usage.month === month && Number.isFinite(usage.manualCount) ? usage.manualCount! : 0;
  const totalCount = usage.month === month && Number.isFinite(usage.count) ? usage.count : 0;
  const totalLimit = monthlyRequestLimit();
  const manualLimit = manualMonthlyRequestLimit();
  return { manualRemaining: Math.max(0, Math.min(manualLimit - manualCount, totalLimit - totalCount)), manualLimit };
}

export async function readSnapshot(): Promise<RadarSnapshot | null> {
  try { return JSON.parse(await readFile(cachePath, "utf8")) as RadarSnapshot; } catch { return null; }
}

export async function writeSnapshot(snapshot: RadarSnapshot) {
  await mkdir(directory, { recursive: true });
  const temporary = `${cachePath}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2));
  await rename(temporary, cachePath);
}

export async function deleteSnapshot() {
  await safeUnlink(cachePath);
}

export async function readLastSuccessfulScanAt() {
  try {
    const parsed = JSON.parse(await readFile(schedulePath, "utf8")) as { lastSuccessfulScanAt?: unknown };
    if (typeof parsed.lastSuccessfulScanAt !== "string" || !Number.isFinite(new Date(parsed.lastSuccessfulScanAt).getTime())) return null;
    return parsed.lastSuccessfulScanAt;
  } catch { return null; }
}

export async function writeLastSuccessfulScanAt(lastSuccessfulScanAt: string) {
  if (!Number.isFinite(new Date(lastSuccessfulScanAt).getTime())) throw new Error("Invalid Radar scan timestamp");
  await mkdir(directory, { recursive: true });
  const temporary = `${schedulePath}.tmp`;
  await writeFile(temporary, JSON.stringify({ lastSuccessfulScanAt }));
  await rename(temporary, schedulePath);
}

export async function blockedRadarPostIds() {
  try {
    const parsed = JSON.parse(await readFile(removalsPath, "utf8")) as { hashes?: unknown };
    return new Set(Array.isArray(parsed.hashes) ? parsed.hashes.filter((value): value is string => typeof value === "string") : []);
  } catch { return new Set<string>(); }
}

export async function blockRadarPost(postId: string) {
  const hashes = await blockedRadarPostIds();
  hashes.add(removalKey(postId));
  await mkdir(directory, { recursive: true });
  const temporary = `${removalsPath}.tmp`;
  await writeFile(temporary, JSON.stringify({ hashes: [...hashes] }));
  await rename(temporary, removalsPath);
  const snapshot = await readSnapshot();
  if (snapshot?.posts.some((post) => post.id === postId)) await writeSnapshot({ ...snapshot, posts: snapshot.posts.filter((post) => post.id !== postId) });
}

export function radarPostRemovalKey(postId: string) {
  return removalKey(postId);
}

export async function purgeAllRadarContent() {
  await Promise.all([safeUnlink(cachePath), safeUnlink(removalsPath), safeUnlink(seenPath), safeUnlink(schedulePath)]);
}

/** Remove the obsolete deduplication cache left by older deployments. */
export async function clearLegacySeenPostCache() {
  await safeUnlink(seenPath);
}

export type RadarRequestKind = "scheduled" | "manual";

export async function reserveMonthlyRequest(kind: RadarRequestKind = "scheduled") {
  await mkdir(directory, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  let usage = { month, count: 0, manualCount: 0 };
  try { usage = JSON.parse(await readFile(usagePath, "utf8")); } catch {}
  if (usage.month !== month) usage = { month, count: 0, manualCount: 0 };
  usage.manualCount = Number.isFinite(usage.manualCount) ? usage.manualCount : 0;
  const limit = monthlyRequestLimit();
  const manualRequestLimit = manualMonthlyRequestLimit();
  if (usage.count >= limit) return { ok: false as const, reason: "total" as const };
  if (kind === "manual" && usage.manualCount >= manualRequestLimit) return { ok: false as const, reason: "manual" as const };
  usage.count += 1;
  if (kind === "manual") usage.manualCount += 1;
  const temporary = `${usagePath}.tmp`;
  await writeFile(temporary, JSON.stringify(usage));
  await rename(temporary, usagePath);
  return { ok: true as const, manualRemaining: manualRequestLimit - usage.manualCount };
}
