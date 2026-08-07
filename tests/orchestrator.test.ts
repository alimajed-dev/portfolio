import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent, TraceStep } from "@/lib/agent-types";
import { MODEL_LABELS } from "@/lib/pipeline-plan";

/**
 * Every provider call is mocked at the `ai` boundary, and `@/lib/models` — the
 * only module that builds a real provider client — is replaced with plain
 * sentinels. No test in this file can reach Gemini or Groq.
 */
vi.mock("ai", () => ({ generateText: vi.fn(), streamText: vi.fn() }));
vi.mock("@/lib/models", () => ({
  geminiModel: "gemini::mock",
  groqModel: "groq::mock",
  missingKeys: () => [],
}));
const captureOperationalError = vi.hoisted(() => vi.fn());
vi.mock("@/lib/monitoring", () => ({ captureOperationalError }));

const GEMINI = "gemini::mock";
const GROQ = "groq::mock";

type CallOpts = { model: string; prompt: string; system: string };

let generateText: ReturnType<typeof vi.fn>;
let streamText: ReturnType<typeof vi.fn>;
let runPipeline: typeof import("@/lib/orchestrator").runPipeline;
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  const ai = await import("ai");
  generateText = ai.generateText as unknown as typeof generateText;
  streamText = ai.streamText as unknown as typeof streamText;
  ({ runPipeline } = await import("@/lib/orchestrator"));

  generateText.mockReset();
  streamText.mockReset();
  captureOperationalError.mockReset();
  // Degradation is logged on purpose (`logStepFailure`); keep the output quiet.
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorLog.mockRestore();
});

/** Streams the given chunks, then optionally fails — the shape `streamText` returns. */
function stream(chunks: string[], failWith?: Error) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
      if (failWith) throw failWith;
    })(),
  };
}

async function run(message = "compare two watch brands") {
  const events: AgentEvent[] = [];
  await runPipeline(message, (event) => events.push(event), new AbortController().signal);
  return {
    events,
    text: events
      .filter((e): e is Extract<AgentEvent, { type: "delta" }> => e.type === "delta")
      .map((e) => e.text)
      .join(""),
    /** The trace as the visitor last saw it. */
    steps(): TraceStep[] {
      const traces = events.filter(
        (e): e is Extract<AgentEvent, { type: "trace" }> => e.type === "trace",
      );
      return traces[traces.length - 1]?.steps ?? [];
    },
  };
}

const step = (steps: TraceStep[], id: string) => steps.find((s) => s.id === id);

/** Planner succeeds with `subTasks`, researchers and critic succeed, writer streams. */
function happyPath(subTasks: string[] = ["one", "two"]) {
  generateText.mockImplementation(async (opts: CallOpts) => {
    if (opts.system.startsWith("You are the planner")) {
      return { text: JSON.stringify(subTasks) };
    }
    if (opts.system.startsWith("You are the critic")) return { text: "- looks solid" };
    return { text: `notes for ${opts.prompt.slice(-20)}` };
  });
  streamText.mockReturnValue(stream(["Final ", "answer."]));
}

describe("runPipeline — happy path", () => {
  it("runs planner, one researcher per sub-task, critic and writer, then finishes", async () => {
    happyPath(["brand history", "price positioning"]);

    const { events, text, steps } = await run();

    expect(text).toBe("Final answer.");
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(events.some((e) => e.type === "status")).toBe(true);

    const outputs = events.filter(
      (event): event is Extract<AgentEvent, { type: "agent_output" }> =>
        event.type === "agent_output",
    );
    expect(outputs.map((output) => output.label)).toEqual([
      "Planner",
      "Researcher 1",
      "Researcher 2",
      "Critic",
    ]);
    expect(outputs[1].text).toContain("notes for");

    const final = steps();
    expect(final.map((s) => s.id)).toEqual([
      "planner",
      "researcher-1",
      "researcher-2",
      "critic",
      "writer",
    ]);
    expect(final.every((s) => s.status === "done")).toBe(true);
    expect(step(final, "planner")?.description).toContain("2 sub-tasks");
    expect(step(final, "researcher-1")?.model).toBe(MODEL_LABELS.groq);
    expect(step(final, "writer")?.model).toBe(MODEL_LABELS.gemini);
  });

  it("routes each stage to the model its badge claims", async () => {
    happyPath(["only one"]);
    await run();

    const systems = generateText.mock.calls.map((call) => call[0] as CallOpts);
    expect(systems.find((o) => o.system.startsWith("You are the planner"))?.model).toBe(GEMINI);
    expect(systems.find((o) => o.system.startsWith("You are a research"))?.model).toBe(GROQ);
    expect(systems.find((o) => o.system.startsWith("You are the critic"))?.model).toBe(GEMINI);
    expect(streamText.mock.calls[0][0].model).toBe(GEMINI);
  });

  it("labels a lone researcher without a number", async () => {
    happyPath(["just the one"]);
    const { steps } = await run();
    expect(step(steps(), "researcher-1")?.name).toBe("Researcher");
    expect(step(steps(), "planner")?.description).toContain("1 sub-task");
  });

  it("caps the fan-out at three researchers however many the planner returns", async () => {
    happyPath(["a", "b", "c", "d", "e"]);
    const { steps } = await run();
    expect(steps().filter((s) => s.id.startsWith("researcher-"))).toHaveLength(3);
  });

  it("finishes and publishes each researcher before starting the next one", async () => {
    let researchersInFlight = 0;
    let maxResearchersInFlight = 0;
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) return { text: '["one","two"]' };
      if (opts.system.startsWith("You are a research")) {
        researchersInFlight += 1;
        maxResearchersInFlight = Math.max(maxResearchersInFlight, researchersInFlight);
        await new Promise((resolve) => setTimeout(resolve, 0));
        researchersInFlight -= 1;
        return { text: `notes for ${opts.prompt}` };
      }
      return { text: "critique" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { events } = await run();
    expect(maxResearchersInFlight).toBe(1);

    const firstOutput = events.findIndex(
      (event) => event.type === "agent_output" && event.label === "Researcher 1",
    );
    const secondStarts = events.findIndex(
      (event) =>
        event.type === "trace" &&
        event.steps.some(
          (candidate) => candidate.id === "researcher-2" && candidate.status === "running",
        ),
    );
    expect(firstOutput).toBeGreaterThan(-1);
    expect(secondStarts).toBeGreaterThan(firstOutput);
  });
});

describe("runPipeline — planner degradation", () => {
  it("researches the request as-is when the planner call fails", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) throw new Error("503 from provider");
      return { text: "notes" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { text, steps } = await run("compare two watch brands");

    expect(step(steps(), "planner")?.status).toBe("error");
    expect(step(steps(), "planner")?.description).toMatch(/researching the request as-is/i);
    // One researcher, handed the original message.
    expect(steps().filter((s) => s.id.startsWith("researcher-"))).toHaveLength(1);
    expect(text).toBe("answer");
    expect(step(steps(), "writer")?.status).toBe("done");
    expect(captureOperationalError).toHaveBeenCalledWith(expect.any(Error), {
      area: "agent-pipeline",
      code: "pipeline_step_failed",
      step: "planner",
    });
  });

  it("reads a bulleted prose plan when the planner ignores the JSON instruction", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) {
        return { text: "1. Check the brand history\n2. Compare current pricing" };
      }
      return { text: "notes" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { steps } = await run();
    const researchers = steps().filter((s) => s.id.startsWith("researcher-"));
    expect(researchers).toHaveLength(2);
    expect(researchers[0].description).toBe("Check the brand history");
  });

  it("salvages complete entries from a plan truncated by the token cap", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) {
        return { text: '["Identify the top brands", "Compare pricing", "Draft the summ' };
      }
      return { text: "notes" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { steps } = await run();
    const researchers = steps().filter((s) => s.id.startsWith("researcher-"));
    // The dangling third literal is dropped rather than becoming a sub-task.
    expect(researchers.map((s) => s.description)).toEqual([
      "Identify the top brands",
      "Compare pricing",
    ]);
  });

  it("falls back to the raw request when the planner returns nothing usable", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) return { text: "   " };
      return { text: "notes" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { steps } = await run("compare two watch brands");
    const researchers = steps().filter((s) => s.id.startsWith("researcher-"));
    expect(researchers).toHaveLength(1);
    expect(researchers[0].description).toBe("compare two watch brands");
  });
});

describe("runPipeline — researcher and critic degradation", () => {
  it("keeps the surviving researchers' notes and marks the failed one", async () => {
    let researcherCalls = 0;
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) return { text: '["a","b"]' };
      if (opts.system.startsWith("You are a research")) {
        researcherCalls += 1;
        if (researcherCalls === 1) throw new Error("groq rate limit");
        return { text: "second worker notes" };
      }
      return { text: "critique" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { steps } = await run();

    expect(step(steps(), "researcher-1")?.status).toBe("error");
    expect(step(steps(), "researcher-1")?.description).toMatch(/no result/);
    expect(step(steps(), "researcher-2")?.status).toBe("done");
    expect(step(steps(), "critic")?.status).toBe("done");

    // The critic only ever sees the notes that survived.
    const criticPrompt = generateText.mock.calls
      .map((call) => call[0] as CallOpts)
      .find((o) => o.system.startsWith("You are the critic"))?.prompt;
    expect(criticPrompt).toContain("second worker notes");
    expect(step(steps(), "writer")?.status).toBe("done");
  });

  it("skips the critic entirely when every researcher failed", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) return { text: '["a","b"]' };
      if (opts.system.startsWith("You are a research")) throw new Error("all down");
      throw new Error("critic should never be called");
    });
    streamText.mockReturnValue(stream(["best effort answer"]));

    const { text, steps } = await run();

    expect(step(steps(), "critic")?.status).toBe("error");
    expect(step(steps(), "critic")?.description).toMatch(/nothing to review/i);
    expect(
      generateText.mock.calls.some((call) => (call[0] as CallOpts).system.startsWith("You are the critic")),
    ).toBe(false);
    // The writer still answers, on the request alone.
    expect(text).toBe("best effort answer");
    expect(streamText.mock.calls[0][0].prompt).toContain("(none available)");
  });

  it("writes up without the critique when the critic call fails", async () => {
    generateText.mockImplementation(async (opts: CallOpts) => {
      if (opts.system.startsWith("You are the planner")) return { text: '["a"]' };
      if (opts.system.startsWith("You are the critic")) throw new Error("critic down");
      return { text: "notes" };
    });
    streamText.mockReturnValue(stream(["answer"]));

    const { text, steps } = await run();

    expect(step(steps(), "critic")?.status).toBe("error");
    expect(step(steps(), "critic")?.description).toMatch(/writing up without it/i);
    expect(streamText.mock.calls[0][0].prompt).not.toContain("Critic's feedback");
    expect(text).toBe("answer");
    expect(step(steps(), "writer")?.status).toBe("done");
  });
});

describe("runPipeline — writer degradation", () => {
  it("reroutes to Groq when Gemini fails before emitting anything", async () => {
    happyPath(["a"]);
    streamText.mockImplementation((opts: { model: string }) =>
      opts.model === GEMINI
        ? stream([], new Error("gemini 429"))
        : stream(["Groq ", "wrote this."]),
    );

    const { text, events, steps } = await run();

    expect(text).toBe("Groq wrote this.");
    expect(events.at(-1)).toEqual({ type: "done" });

    const writer = step(steps(), "writer");
    expect(writer?.status).toBe("done");
    // The badge has to name the model that actually ran.
    expect(writer?.model).toBe(MODEL_LABELS.groq);
    expect(writer?.reason).toMatch(/fallback/i);
  });

  it("treats an empty Gemini stream as a failure, not a successful blank answer", async () => {
    happyPath(["a"]);
    streamText.mockImplementation((opts: { model: string }) =>
      opts.model === GEMINI ? stream([]) : stream(["fallback text"]),
    );

    const { text, steps } = await run();

    expect(text).toBe("fallback text");
    expect(step(steps(), "writer")?.model).toBe(MODEL_LABELS.groq);
  });

  it("truncates rather than retrying when Gemini fails after partial output", async () => {
    happyPath(["a"]);
    streamText.mockImplementation((opts: { model: string }) =>
      opts.model === GEMINI
        ? stream(["Half an answer"], new Error("stream reset"))
        : stream(["SHOULD NOT RUN"]),
    );

    const { text, events, steps } = await run();

    expect(streamText).toHaveBeenCalledTimes(1); // no retry: it would duplicate text
    expect(text).toContain("Half an answer");
    expect(text).toMatch(/cut off/i);
    expect(text).not.toContain("SHOULD NOT RUN");
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(step(steps(), "writer")?.status).toBe("error");
  });

  it("emits one error event and no `done` when both writers fail", async () => {
    happyPath(["a"]);
    streamText.mockImplementation(() => stream([], new Error("everything is down")));

    const { text, events, steps } = await run();

    expect(text).toBe("");
    expect(events.at(-1)).toMatchObject({
      type: "error",
      message: expect.stringMatching(/couldn't finish this one/i),
    });
    expect(events.some((e) => e.type === "done")).toBe(false);
    expect(step(steps(), "writer")?.status).toBe("error");
    expect(step(steps(), "writer")?.description).toMatch(/both models failed/i);
  });

  it("propagates an abort instead of silently rerouting to Groq", async () => {
    happyPath(["a"]);
    const controller = new AbortController();
    streamText.mockImplementation(() => {
      controller.abort();
      return stream([], new Error("aborted"));
    });

    await expect(
      runPipeline("hello", () => {}, controller.signal),
    ).rejects.toThrow();
    expect(streamText).toHaveBeenCalledTimes(1);
  });
});

describe("runPipeline — visitor-facing invariants", () => {
  it("never puts the visitor's raw prompt in a trace description unshortened", async () => {
    happyPath([`${"x".repeat(300)}`]);
    const { steps } = await run();
    const description = step(steps(), "researcher-1")?.description ?? "";
    expect(description.length).toBeLessThanOrEqual(90);
    expect(description.endsWith("…")).toBe(true);
  });

  it("emits a trace before any model is called, so the panel is never blank", async () => {
    happyPath(["a"]);
    const { events } = await run();
    expect(events[0].type).toBe("trace");
    expect((events[0] as Extract<AgentEvent, { type: "trace" }>).steps).toHaveLength(4);
  });
});
