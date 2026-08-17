import { authorizeManualRefresh, sameOrigin } from "@/lib/x-radar/admin";
import { getRadarUsage } from "@/lib/x-radar/cache";
import { clientIp } from "@/lib/rate-limit";
import { forceRefreshRadar, getNextRefreshAt } from "@/lib/x-radar/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!process.env.X_RADAR_ADMIN_TOKEN || process.env.X_RADAR_ADMIN_TOKEN.length < 32) {
    return Response.json({ error: "Manual scanning is not configured." }, { status: 503, headers });
  }
  if (!sameOrigin(request)) return Response.json({ error: "Request rejected." }, { status: 403, headers });

  const authorization = authorizeManualRefresh(request, clientIp(request.headers));
  if (!authorization.ok) {
    return Response.json({ error: authorization.limited ? "Too many failed unlock attempts. Try again later." : "Invalid owner token." }, { status: authorization.limited ? 429 : 401, headers });
  }

  const usage = await getRadarUsage();
  if (usage.manualRemaining <= 0) {
    return Response.json({ error: "Monthly manual scan limit reached.", manualRefresh: { enabled: true, ...usage } }, { status: 429, headers });
  }

  try {
    const snapshot = await forceRefreshRadar(request.signal);
    return Response.json({ ...snapshot, nextRefreshAt: getNextRefreshAt(), manualRefresh: { enabled: true, ...(await getRadarUsage()) } }, { headers });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("limit reached") ? error.message : "The manual scan failed. No additional retry was started.";
    return Response.json({ error: message, manualRefresh: { enabled: true, ...(await getRadarUsage()) } }, { status: message.includes("limit reached") ? 429 : 502, headers });
  }
}
