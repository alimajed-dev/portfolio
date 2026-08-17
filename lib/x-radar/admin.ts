import { createHash, timingSafeEqual } from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (!origin || !host) return false;
  try { return new URL(origin).origin === `${protocol}://${host}`; } catch { return false; }
}

export function authorizeManualRefresh(request: Request, client: string) {
  const now = Date.now();
  if (attempts.size >= 1_000) {
    for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  }
  const attempt = attempts.get(client);
  if (!attempt && attempts.size >= 1_000) return { ok: false as const, limited: true };
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_FAILURES) return { ok: false as const, limited: true };

  const configured = process.env.X_RADAR_ADMIN_TOKEN ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const valid = configured.length >= 32 && supplied.length > 0 && timingSafeEqual(digest(configured), digest(supplied));
  if (valid) {
    attempts.delete(client);
    return { ok: true as const };
  }

  const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + WINDOW_MS };
  current.count += 1;
  attempts.set(client, current);
  return { ok: false as const, limited: current.count >= MAX_FAILURES };
}
