import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RadarSnapshot } from "./types";

const directory = process.env.X_RADAR_DATA_DIR || path.join(process.cwd(), ".data");
const cachePath = path.join(directory, "x-radar.json");
const usagePath = path.join(directory, "x-radar-usage.json");

function manualLimit() {
  return Math.min(50, Math.max(1, Number(process.env.X_MANUAL_MONTHLY_REQUEST_LIMIT) || 50));
}

export async function getRadarUsage() {
  const month = new Date().toISOString().slice(0, 7);
  let usage: { month: string; count: number; manualCount?: number } = { month, count: 0, manualCount: 0 };
  try { usage = JSON.parse(await readFile(usagePath, "utf8")); } catch {}
  const manualCount = usage.month === month && Number.isFinite(usage.manualCount) ? usage.manualCount! : 0;
  const totalCount = usage.month === month && Number.isFinite(usage.count) ? usage.count : 0;
  const totalLimit = Math.max(1, Number(process.env.X_MONTHLY_REQUEST_LIMIT) || 180);
  return { manualRemaining: Math.max(0, Math.min(manualLimit() - manualCount, totalLimit - totalCount)), manualLimit: manualLimit() };
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

export type RadarRequestKind = "scheduled" | "manual";

export async function reserveMonthlyRequest(kind: RadarRequestKind = "scheduled") {
  await mkdir(directory, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  let usage = { month, count: 0, manualCount: 0 };
  try { usage = JSON.parse(await readFile(usagePath, "utf8")); } catch {}
  if (usage.month !== month) usage = { month, count: 0, manualCount: 0 };
  usage.manualCount = Number.isFinite(usage.manualCount) ? usage.manualCount : 0;
  const limit = Math.max(1, Number(process.env.X_MONTHLY_REQUEST_LIMIT) || 180);
  const manualRequestLimit = manualLimit();
  if (usage.count >= limit) return { ok: false as const, reason: "total" as const };
  if (kind === "manual" && usage.manualCount >= manualRequestLimit) return { ok: false as const, reason: "manual" as const };
  usage.count += 1;
  if (kind === "manual") usage.manualCount += 1;
  const temporary = `${usagePath}.tmp`;
  await writeFile(temporary, JSON.stringify(usage));
  await rename(temporary, usagePath);
  return { ok: true as const, manualRemaining: manualRequestLimit - usage.manualCount };
}
