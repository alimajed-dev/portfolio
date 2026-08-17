import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RadarSnapshot } from "./types";

const directory = process.env.X_RADAR_DATA_DIR || path.join(process.cwd(), ".data");
const cachePath = path.join(directory, "x-radar.json");
const usagePath = path.join(directory, "x-radar-usage.json");

export async function readSnapshot(): Promise<RadarSnapshot | null> {
  try { return JSON.parse(await readFile(cachePath, "utf8")) as RadarSnapshot; } catch { return null; }
}

export async function writeSnapshot(snapshot: RadarSnapshot) {
  await mkdir(directory, { recursive: true });
  const temporary = `${cachePath}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2));
  await rename(temporary, cachePath);
}

export async function reserveMonthlyRequest() {
  await mkdir(directory, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  let usage = { month, count: 0 };
  try { usage = JSON.parse(await readFile(usagePath, "utf8")); } catch {}
  if (usage.month !== month) usage = { month, count: 0 };
  const limit = Math.max(1, Number(process.env.X_MONTHLY_REQUEST_LIMIT) || 180);
  if (usage.count >= limit) return false;
  usage.count += 1;
  await writeFile(usagePath, JSON.stringify(usage));
  return true;
}
