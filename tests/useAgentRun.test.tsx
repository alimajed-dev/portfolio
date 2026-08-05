/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent } from "@/lib/agent-types";
import { useAgentRun } from "@/lib/useAgentRun";

const SSE = "text/event-stream; charset=utf-8";

function sseResponse(events: AgentEvent[], init: { status?: number } = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: init.status ?? 200,
    headers: { "Content-Type": SSE },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  // Vitest runs without `globals`, so RTL cannot install its own auto-cleanup.
  cleanup();
  vi.unstubAllGlobals();
});

const assistantOf = (messages: { role: string }[]) => messages.at(-1) as never;

describe("useAgentRun", () => {
  it("records the prompt, streams the answer and updates the trace", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        {
          type: "trace",
          steps: [
            {
              id: "planner",
              name: "Planner",
              model: "Gemini 3.6 Flash",
              description: "Breaking your request into sub-tasks",
              reason: "needs reasoning, not speed",
              status: "running",
            },
          ],
        },
        { type: "status", text: "Coordinating agents…" },
        { type: "delta", text: "Hello" },
        { type: "delta", text: ", world." },
        { type: "done" },
      ]),
    );

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("  tell me something  ");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({ role: "user", content: "tell me something" });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Hello, world.",
      status: undefined,
    });
    expect(result.current.messages[1].error).toBeFalsy();
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.running).toBe(false);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ message: "tell me something" });
  });

  it("shows the route's own SSE error frame, even on a 429", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([{ type: "error", message: "Daily demo limit reached (5 runs)." }], {
        status: 429,
      }),
    );

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    expect(assistantOf(result.current.messages)).toMatchObject({
      content: "Daily demo limit reached (5 runs).",
      error: true,
    });
  });

  // F-005: a proxy error page used to parse to zero events and get reported as
  // a successful-but-empty run, hiding the outage.
  it("reports a proxy's HTML 502 as an outage, not as an empty agent run", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    const assistant = assistantOf(result.current.messages) as { content: string; error: boolean };
    expect(assistant.error).toBe(true);
    expect(assistant.content).toMatch(/temporarily unavailable \(HTTP 502\)/);
    expect(assistant.content).not.toMatch(/finished without producing an answer/);
  });

  it("reports a 200 that isn't an event stream as an unexpected response", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    expect(assistantOf(result.current.messages)).toMatchObject({
      content: expect.stringMatching(/unexpected response/i),
      error: true,
    });
  });

  it("still reports a genuinely empty SSE run as producing no answer", async () => {
    fetchMock.mockResolvedValue(sseResponse([{ type: "done" }]));

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    expect(assistantOf(result.current.messages)).toMatchObject({
      content: expect.stringMatching(/finished without producing an answer/i),
      error: true,
    });
  });

  it("reports a failed fetch as a connection problem", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    expect(assistantOf(result.current.messages)).toMatchObject({
      content: expect.stringMatching(/couldn't reach the agents/i),
      error: true,
    });
    expect(result.current.running).toBe(false);
  });

  it("stays quiet when the run is aborted", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);

    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("hi");
    });

    const assistant = assistantOf(result.current.messages) as { status: string; error?: boolean };
    expect(assistant.status).toBe("Starting the agent run…");
    expect(assistant.error).toBeFalsy();
  });

  it("ignores a second send while a run is in flight", async () => {
    let release!: (value: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (release = resolve)));

    const { result } = renderHook(() => useAgentRun());

    let first!: Promise<void>;
    act(() => {
      first = result.current.send("first");
    });
    await waitFor(() => expect(result.current.running).toBe(true));

    await act(async () => {
      await result.current.send("second");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(sseResponse([{ type: "delta", text: "done" }, { type: "done" }]));
      await first;
    });
    expect(result.current.messages).toHaveLength(2);
  });

  it("ignores blank input without calling the API", async () => {
    const { result } = renderHook(() => useAgentRun());
    await act(async () => {
      await result.current.send("   ");
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("aborts the in-flight run when the component unmounts", async () => {
    let observed: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: { signal: AbortSignal }) => {
      observed = init.signal;
      return new Promise<Response>(() => {});
    });

    const { result, unmount } = renderHook(() => useAgentRun());
    act(() => {
      void result.current.send("hi");
    });
    await waitFor(() => expect(observed).toBeDefined());

    unmount();
    expect(observed?.aborted).toBe(true);
  });
});
