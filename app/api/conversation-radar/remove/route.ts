import { authorizeManualRefresh, sameOrigin } from "@/lib/x-radar/admin";
import { blockRadarPost } from "@/lib/x-radar/cache";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return Response.json({ error: "Request rejected." }, { status: 403, headers });
  const authorization = authorizeManualRefresh(request, clientIp(request.headers));
  if (!authorization.ok) return Response.json({ error: authorization.limited ? "Too many failed unlock attempts. Try again later." : "Invalid owner token." }, { status: authorization.limited ? 429 : 401, headers });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "A post ID is required." }, { status: 400, headers }); }
  const postId = typeof body === "object" && body !== null && "postId" in body ? (body as { postId?: unknown }).postId : undefined;
  if (typeof postId !== "string" || !/^\d{1,19}$/.test(postId)) return Response.json({ error: "A valid X post ID is required." }, { status: 400, headers });

  await blockRadarPost(postId);
  return new Response(null, { status: 204, headers });
}
