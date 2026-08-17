import { getNextRefreshAt, getSnapshot } from "@/lib/x-radar/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getSnapshot();
  return Response.json({
    ...(snapshot ?? { posts: [], lastRefreshedAt: null, source: "x", stats: { scanned: 0, rejected: 0, opportunities: 0 } }),
    nextRefreshAt: getNextRefreshAt(),
  }, { headers: { "Cache-Control": "no-store" } });
}
