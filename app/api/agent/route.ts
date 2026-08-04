import type { NextRequest } from "next/server";
import type { AgentEvent } from "@/lib/agent-types";
import { checkInput } from "@/lib/content-filter";
import { missingKeys } from "@/lib/models";
import { runPipeline } from "@/lib/orchestrator";
import { clientIp, releaseRun, reserveRun } from "@/lib/rate-limit";

/**
 * Long-lived Node process (Railway), not an edge/serverless function — a full
 * agent run streams for longer than serverless platforms allow.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Stops nginx-style proxies from buffering the stream into one blob.
  "X-Accel-Buffering": "no",
};

function frame(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** A one-shot stream that carries a single error event, so the client has one code path. */
function errorStream(message: string, status: number, headers: Record<string, string> = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(frame({ type: "error", message })));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { ...SSE_HEADERS, ...headers } });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorStream("That request didn't parse. Try sending your message again.", 400);
  }

  const message = (payload as { message?: unknown } | null)?.message;
  const filtered = checkInput(message);
  if (!filtered.ok) {
    return errorStream(filtered.message, 400);
  }
  const userMessage = (message as string).trim();

  const absent = missingKeys();
  if (absent.length > 0) {
    console.error(`[agent] missing env vars: ${absent.join(", ")}`);
    return errorStream(
      "The demo isn't configured with model credentials right now. Everything else on the site still works.",
      503,
    );
  }

  const ip = clientIp(request.headers);
  const limit = reserveRun(ip);
  if (!limit.ok) {
    return errorStream(limit.reason, 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  // The client going away should stop the model calls, not just the writes.
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      releaseRun(ip);
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: AgentEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(frame(event)));
        } catch {
          closed = true;
        }
      };

      try {
        await runPipeline(userMessage, send, abort.signal);
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("[agent] pipeline failed:", error);
          send({
            type: "error",
            message: "Something went wrong running the agents. Try again in a moment.",
          });
        }
      } finally {
        closed = true;
        release();
        try {
          controller.close();
        } catch {
          // already closed by the client disconnecting
        }
      }
    },
    cancel() {
      abort.abort();
      release();
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}
