import { getNextRefreshAt, getSnapshot } from "@/lib/x-radar/service";
import { getRadarUsage } from "@/lib/x-radar/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [snapshot, usage] = await Promise.all([getSnapshot(), getRadarUsage()]);
  return Response.json({
    ...(snapshot ?? { posts: [], lastRefreshedAt: null, source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 } }),
    nextRefreshAt: getNextRefreshAt(),
    manualRefresh: { enabled: Boolean(process.env.X_RADAR_ADMIN_TOKEN), ...usage },
  }, { headers: { "Cache-Control": "no-store" } });
}
