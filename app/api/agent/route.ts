import type { NextRequest } from "next/server";
import type { AgentEvent } from "@/lib/agent-types";
import { checkInput } from "@/lib/content-filter";
import { missingKeys } from "@/lib/models";
import { captureOperationalError } from "@/lib/monitoring";
import { runPipeline } from "@/lib/orchestrator";
import { clientIp, reserveRun } from "@/lib/rate-limit";

/**
 * Long-lived Node process (Railway), not an edge/serverless function — a full
 * agent run streams for longer than serverless platforms allow.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * End-to-end ceiling for one run. `lib/orchestrator.ts` bounds each individual
 * model call, but planner → researchers → critic → writer → fallback can each
 * wait near their own timeout and stack up to several minutes, holding the
 * visitor's one active run slot and a server stream the whole time. This makes
 * the total a deliberate number instead of an emergent one.
 */
const DEFAULT_RUN_TIMEOUT_MS = 180_000;

function runTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.AGENT_RUN_TIMEOUT_MS ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RUN_TIMEOUT_MS;
}

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
    captureOperationalError(new Error("Agent model credentials are missing"), {
      area: "agent-route",
      code: "model_credentials_missing",
    });
    return errorStream(
      "The demo isn't configured with model credentials right now. Everything else on the site still works.",
      503,
    );
  }

  const limit = reserveRun(clientIp(request.headers));
  if (!limit.ok) {
    return errorStream(limit.reason, 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }
  // Bound to the reservation and idempotent, so every exit path below can call
  // it unconditionally: normal finish, pipeline throw, deadline, disconnect.
  const release = limit.release;

  const encoder = new TextEncoder();
  const abort = new AbortController();
  // The client going away should stop the model calls, not just the writes.
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });

  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, runTimeoutMs());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let streamedAnswer = false;
      const send = (event: AgentEvent) => {
        if (closed) return;
        if (event.type === "delta") streamedAnswer = true;
        try {
          controller.enqueue(encoder.encode(frame(event)));
        } catch {
          closed = true;
        }
      };

      try {
        await runPipeline(userMessage, send, abort.signal);
      } catch (error) {
        if (timedOut) {
          console.error("[agent] run exceeded its deadline");
          captureOperationalError(error, {
            area: "agent-route",
            code: "run_timeout",
          });
          // An `error` event replaces the assistant message on the client, so
          // after partial output the honest signal is an appended note rather
          // than throwing away the text the visitor already read.
          send(
            streamedAnswer
              ? {
                  type: "delta",
                  text: "\n\n(The run hit its time limit and stopped here — the answer above is incomplete.)",
                }
              : {
                  type: "error",
                  message:
                    "The agents took too long on this one and the run was stopped. Try again, or ask something narrower.",
                },
          );
          send({ type: "done" });
        } else if (!abort.signal.aborted) {
          console.error("[agent] pipeline failed");
          captureOperationalError(error, {
            area: "agent-route",
            code: "pipeline_failed",
          });
          send({
            type: "error",
            message: "Something went wrong running the agents. Try again in a moment.",
          });
        }
      } finally {
        closed = true;
        clearTimeout(deadline);
        release();
        try {
          controller.close();
        } catch {
          // already closed by the client disconnecting
        }
      }
    },
    cancel() {
      clearTimeout(deadline);
      abort.abort();
      release();
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}
