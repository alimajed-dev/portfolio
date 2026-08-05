import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { AgentEvent } from "@/lib/agent-types";
import { readEvents } from "@/lib/agent-transport";

/**
 * The route is exercised end to end over real Request/Response objects, with the
 * model pipeline and provider credentials mocked. Nothing here can reach Gemini
 * or Groq: `@/lib/orchestrator` and `@/lib/models` are replaced wholesale, and
 * `@/lib/models` is the only module that constructs a provider client.
 */
vi.mock("@/lib/orchestrator", () => ({ runPipeline: vi.fn() }));
vi.mock("@/lib/models", () => ({ missingKeys: vi.fn(() => []) }));

type Emit = (event: AgentEvent) => void;
type RunPipeline = (message: string, emit: Emit, signal: AbortSignal) => Promise<void>;

let POST: (request: NextRequest) => Promise<Response>;
let runPipeline: ReturnType<typeof vi.fn<RunPipeline>>;
let missingKeys: ReturnType<typeof vi.fn<() => string[]>>;
let rateLimit: typeof import("@/lib/rate-limit");

const CLIENT = { "x-forwarded-for": "203.0.113.7" };

function post(
  body: unknown,
  init: { headers?: Record<string, string>; signal?: AbortSignal } = {},
): NextRequest {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json", ...CLIENT, ...init.headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: init.signal,
  }) as unknown as NextRequest;
}

async function events(response: Response): Promise<AgentEvent[]> {
  if (!response.body) return [];
  const collected: AgentEvent[] = [];
  for await (const event of readEvents(response.body)) collected.push(event);
  return collected;
}

/** True when the visitor's concurrency slot came back, i.e. `release` ran. */
function slotIsFree(ip = "203.0.113.7"): boolean {
  const probe = rateLimit.reserveRun(ip);
  if (probe.ok) probe.release();
  return probe.ok;
}

beforeEach(async () => {
  vi.resetModules();
  const orchestrator = await import("@/lib/orchestrator");
  const models = await import("@/lib/models");
  runPipeline = orchestrator.runPipeline as typeof runPipeline;
  missingKeys = models.missingKeys as typeof missingKeys;
  rateLimit = await import("@/lib/rate-limit");
  ({ POST } = await import("@/app/api/agent/route"));

  runPipeline.mockReset();
  missingKeys.mockReset().mockReturnValue([]);
  runPipeline.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/agent — rejections", () => {
  it("answers unparseable JSON with an SSE 400 and never starts a run", async () => {
    const response = await POST(post("{ not json"));

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await events(response)).toEqual([
      { type: "error", message: "That request didn't parse. Try sending your message again." },
    ]);
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("answers invalid messages with an SSE 400 carrying the filter's own wording", async () => {
    for (const body of [{}, { message: "" }, { message: "   " }, { message: 42 }]) {
      const response = await POST(post(body));
      expect(response.status, JSON.stringify(body)).toBe(400);

      const [event] = await events(response);
      expect(event.type).toBe("error");
      expect(runPipeline).not.toHaveBeenCalled();
    }
  });

  it("answers 503 when provider credentials are absent", async () => {
    missingKeys.mockReturnValue(["GEMINI_API_KEY", "GROQ_API_KEY"]);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(post({ message: "hello" }));

    expect(response.status).toBe(503);
    expect(await events(response)).toEqual([
      {
        type: "error",
        message:
          "The demo isn't configured with model credentials right now. Everything else on the site still works.",
      },
    ]);
    expect(runPipeline).not.toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it("answers 429 with Retry-After once the visitor's quota is spent", async () => {
    for (let i = 0; i < rateLimit.LIMITS.RUNS_PER_DAY; i += 1) {
      const spent = rateLimit.reserveRun("203.0.113.7");
      if (spent.ok) spent.release();
    }

    const response = await POST(post({ message: "hello" }));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    const [event] = await events(response);
    expect(event).toMatchObject({ type: "error", message: expect.stringMatching(/daily demo limit/i) });
    expect(runPipeline).not.toHaveBeenCalled();
  });

  it("keys the quota off the trusted proxy hop, so a forged header can't buy runs", async () => {
    for (let i = 0; i < rateLimit.LIMITS.RUNS_PER_DAY; i += 1) {
      const spent = rateLimit.reserveRun("203.0.113.7");
      if (spent.ok) spent.release();
    }

    const response = await POST(
      post({ message: "hello" }, { headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.7" } }),
    );

    expect(response.status).toBe(429);
  });
});

describe("POST /api/agent — streaming", () => {
  it("streams the pipeline's events and releases the run slot on success", async () => {
    runPipeline.mockImplementation(async (message, emit) => {
      emit({ type: "status", text: "Coordinating agents…" });
      emit({ type: "delta", text: `answer to: ${message}` });
      emit({ type: "done" });
    });

    const response = await POST(post({ message: "  hello  " }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await events(response)).toEqual([
      { type: "status", text: "Coordinating agents…" },
      { type: "delta", text: "answer to: hello" }, // trimmed before reaching the pipeline
      { type: "done" },
    ]);
    expect(slotIsFree()).toBe(true);
  });

  it("turns a thrown pipeline into one visitor-safe error frame and still releases", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    runPipeline.mockRejectedValue(new Error("GEMINI_API_KEY=sk-secret rejected"));

    const response = await POST(post({ message: "hello" }));
    const frames = await events(response);

    expect(response.status).toBe(200);
    expect(frames).toEqual([
      { type: "error", message: "Something went wrong running the agents. Try again in a moment." },
    ]);
    // The upstream message must not leak into the stream.
    expect(JSON.stringify(frames)).not.toContain("sk-secret");
    expect(slotIsFree()).toBe(true);
    errorLog.mockRestore();
  });

  it("releases the run slot when the visitor disconnects mid-run", async () => {
    const aborted = new AbortController();
    runPipeline.mockImplementation(
      (_message, _emit, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );

    const response = await POST(post({ message: "hello" }, { signal: aborted.signal }));
    aborted.abort();

    // A disconnect is not an error the visitor can see — no frame is produced.
    expect(await events(response)).toEqual([]);
    expect(slotIsFree()).toBe(true);
  });
});

describe("POST /api/agent — whole-run deadline", () => {
  it("stops a run that overruns its budget and reports it honestly", async () => {
    vi.stubEnv("AGENT_RUN_TIMEOUT_MS", "25");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    let observedSignal: AbortSignal | undefined;

    runPipeline.mockImplementation(
      (_message, _emit, signal) =>
        new Promise((_resolve, reject) => {
          observedSignal = signal;
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );

    const response = await POST(post({ message: "hello" }));
    const frames = await events(response);

    expect(observedSignal?.aborted).toBe(true);
    expect(frames).toEqual([
      {
        type: "error",
        message:
          "The agents took too long on this one and the run was stopped. Try again, or ask something narrower.",
      },
      { type: "done" },
    ]);
    expect(slotIsFree()).toBe(true);
    errorLog.mockRestore();
  });

  it("keeps partially streamed text and appends a truncation note instead of replacing it", async () => {
    vi.stubEnv("AGENT_RUN_TIMEOUT_MS", "25");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    runPipeline.mockImplementation(
      (_message, emit, signal) =>
        new Promise((_resolve, reject) => {
          emit({ type: "delta", text: "half an answer" });
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );

    const frames = await events(await POST(post({ message: "hello" })));

    // An `error` frame replaces the assistant message on the client, so after
    // partial output the note has to arrive as a delta.
    expect(frames.map((f) => f.type)).toEqual(["delta", "delta", "done"]);
    expect(frames[1]).toMatchObject({ type: "delta", text: expect.stringMatching(/time limit/i) });
    expect(slotIsFree()).toBe(true);
    errorLog.mockRestore();
  });

  it("ignores a malformed AGENT_RUN_TIMEOUT_MS rather than running without a deadline", async () => {
    vi.stubEnv("AGENT_RUN_TIMEOUT_MS", "not-a-number");
    runPipeline.mockImplementation(async (_message, emit) => {
      emit({ type: "done" });
    });

    const frames = await events(await POST(post({ message: "hello" })));
    expect(frames).toEqual([{ type: "done" }]);
    expect(slotIsFree()).toBe(true);
  });
});
