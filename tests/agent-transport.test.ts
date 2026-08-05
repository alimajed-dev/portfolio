import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@/lib/agent-types";
import { UNEXPECTED_RESPONSE, checkAgentResponse, readEvents } from "@/lib/agent-transport";

const SSE = "text/event-stream; charset=utf-8";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of readEvents(stream)) events.push(event);
  return events;
}

const frame = (event: AgentEvent) => `data: ${JSON.stringify(event)}\n\n`;

describe("checkAgentResponse", () => {
  it("passes an SSE 200 through", () => {
    const response = new Response("", { status: 200, headers: { "Content-Type": SSE } });
    expect(checkAgentResponse(response)).toBeNull();
  });

  // The route answers 400/429/503 as SSE too, carrying an `error` frame. Those
  // are real agent responses and must keep reaching the SSE path.
  it("passes the route's own SSE error responses through", () => {
    for (const status of [400, 429, 503]) {
      const response = new Response("", { status, headers: { "Content-Type": SSE } });
      expect(checkAgentResponse(response), String(status)).toBeNull();
    }
  });

  it("reports an outage for a proxy's HTML error page", () => {
    const response = new Response("<html>502 Bad Gateway</html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });
    expect(checkAgentResponse(response)).toMatch(/temporarily unavailable \(HTTP 502\)/);
  });

  it("distinguishes server errors, client errors and rate limiting when the body isn't SSE", () => {
    const nonSse = (status: number) =>
      checkAgentResponse(
        new Response("boom", { status, headers: { "Content-Type": "text/plain" } }),
      );

    expect(nonSse(500)).toMatch(/HTTP 500/);
    expect(nonSse(503)).toMatch(/temporarily unavailable/i);
    expect(nonSse(429)).toMatch(/too many requests/i);
    expect(nonSse(404)).toMatch(/HTTP 404/);
  });

  it("rejects a 200 that isn't an event stream", () => {
    const response = new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    expect(checkAgentResponse(response)).toBe(UNEXPECTED_RESPONSE);
  });

  it("rejects a response with no content type at all", () => {
    const response = new Response(null, { status: 200 });
    response.headers.delete("content-type");
    expect(checkAgentResponse(response)).toBe(UNEXPECTED_RESPONSE);
  });
});

describe("readEvents", () => {
  it("parses a full run's frames in order", async () => {
    const events: AgentEvent[] = [
      { type: "status", text: "Coordinating agents…" },
      { type: "delta", text: "Hello" },
      { type: "delta", text: " world" },
      { type: "done" },
    ];
    expect(await collect(streamOf(...events.map(frame)))).toEqual(events);
  });

  it("reassembles frames split across chunk boundaries", async () => {
    const payload = frame({ type: "delta", text: "split me" });
    const mid = Math.floor(payload.length / 2);
    expect(await collect(streamOf(payload.slice(0, mid), payload.slice(mid)))).toEqual([
      { type: "delta", text: "split me" },
    ]);
  });

  it("handles several frames arriving in one chunk", async () => {
    const chunk = frame({ type: "delta", text: "a" }) + frame({ type: "delta", text: "b" });
    expect(await collect(streamOf(chunk))).toHaveLength(2);
  });

  it("survives a multi-byte character split across chunks", async () => {
    const encoded = new TextEncoder().encode(frame({ type: "delta", text: "café →" }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Byte-at-a-time delivery guarantees a split inside a UTF-8 sequence.
        for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    expect(await collect(stream)).toEqual([{ type: "delta", text: "café →" }]);
  });

  it("skips malformed frames instead of killing the run", async () => {
    const stream = streamOf(
      "data: {not json}\n\n",
      frame({ type: "delta", text: "still here" }),
      "data: 42\n\n", // valid JSON, not an AgentEvent
      'data: {"noType":true}\n\n',
      frame({ type: "done" }),
    );
    expect(await collect(stream)).toEqual([{ type: "delta", text: "still here" }, { type: "done" }]);
  });

  it("ignores comment and event lines and joins multi-line data", async () => {
    const stream = streamOf(': keep-alive\nevent: message\ndata: {"type":"delta",\ndata: "text":"joined"}\n\n');
    expect(await collect(stream)).toEqual([{ type: "delta", text: "joined" }]);
  });

  it("yields nothing for an empty body, rather than throwing", async () => {
    expect(await collect(streamOf())).toEqual([]);
  });

  it("drops a trailing frame that was never terminated", async () => {
    const stream = streamOf(frame({ type: "delta", text: "complete" }), 'data: {"type":"done"}');
    expect(await collect(stream)).toEqual([{ type: "delta", text: "complete" }]);
  });

  it("propagates a mid-stream network failure to the caller", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(frame({ type: "delta", text: "partial" })));
        controller.error(new Error("network dropped"));
      },
    });
    await expect(collect(stream)).rejects.toThrow(/network dropped/);
  });
});
