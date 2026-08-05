import type { AgentEvent } from "./agent-types";

/**
 * Client-side transport for `POST /api/agent`. Kept apart from the React hook so
 * response validation and SSE framing can be tested without a DOM or a renderer.
 */

const SSE_CONTENT_TYPE = "text/event-stream";

export const UNEXPECTED_RESPONSE =
  "Got an unexpected response from the server — the demo may be redeploying. Try again in a moment.";

function transportMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return `The demo is temporarily unavailable (HTTP ${status}). It may be redeploying — try again in a moment.`;
  }
  if (status === 429) {
    return "Too many requests are hitting the demo right now. Try again in a moment.";
  }
  if (status >= 500) {
    return `The server hit an error (HTTP ${status}). Try again in a moment.`;
  }
  if (status >= 400) {
    return `The server rejected the request (HTTP ${status}). Try again in a moment.`;
  }
  return UNEXPECTED_RESPONSE;
}

/**
 * Returns a user-facing message when the response is not an agent stream, or
 * null when it is safe to parse.
 *
 * The route answers `text/event-stream` for every outcome it owns, including its
 * own 400/429/503 rejections, which travel as SSE `error` frames — those are
 * real agent responses and must keep flowing through the SSE path. Anything else
 * (a proxy's HTML 502, a framework stack trace, a body-less response) is a
 * transport failure. Without this check such a response parses to zero events
 * and gets reported as "the agents finished without producing an answer", which
 * hides the actual outage.
 */
export function checkAgentResponse(response: Response): string | null {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes(SSE_CONTENT_TYPE)) {
    return transportMessage(response.status);
  }
  return null;
}

function isAgentEvent(value: unknown): value is AgentEvent {
  return (
    typeof value === "object" && value !== null && typeof (value as AgentEvent).type === "string"
  );
}

/** Splits an SSE byte stream into `data:` payloads. */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) {
          try {
            const parsed: unknown = JSON.parse(data);
            if (isAgentEvent(parsed)) yield parsed;
          } catch {
            // Ignore malformed frames rather than killing the run.
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
