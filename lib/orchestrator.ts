import { generateText, streamText, type LanguageModel } from "ai";
import type { AgentEvent, StepStatus, TraceStep } from "./agent-types";
import { geminiModel, groqModel } from "./models";
import { MODEL_LABELS, REASONS, initialSteps, makeStep } from "./pipeline-plan";

export type Emit = (event: AgentEvent) => void;

/** Per-model-call ceiling, so one hung provider can't stall the whole run. */
const CALL_TIMEOUT_MS = 60_000;
const MAX_RESEARCHERS = 3;

function timeoutSignal(outer: AbortSignal): AbortSignal {
  return AbortSignal.any([outer, AbortSignal.timeout(CALL_TIMEOUT_MS)]);
}

/**
 * Each stage degrades instead of aborting, so without this the cause of a
 * failed step never leaves the process — which is exactly how a retired model
 * id looked like "the demo is just broken" instead of a 404.
 */
function logStepFailure(step: string, error: unknown) {
  const err = error as { name?: string; statusCode?: number; message?: string };
  console.error(
    `[agent] ${step} failed:`,
    [err?.name, err?.statusCode, err?.message].filter(Boolean).join(" | ") || error,
  );
}

async function callModel(opts: {
  model: LanguageModel;
  system: string;
  prompt: string;
  signal: AbortSignal;
  maxOutputTokens?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: opts.model,
    system: opts.system,
    prompt: opts.prompt,
    temperature: 0.4,
    maxOutputTokens: opts.maxOutputTokens ?? 700,
    abortSignal: timeoutSignal(opts.signal),
  });
  return text.trim();
}

/** Pulls a JSON array of strings out of a model response without trusting its formatting. */
function parseSubTasks(raw: string, fallback: string): string[] {
  const clean = (values: string[]) =>
    values
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_RESEARCHERS);

  // 1. A well-formed array, with or without surrounding prose/fences.
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed: unknown = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        const tasks = clean(parsed.filter((t): t is string => typeof t === "string"));
        if (tasks.length > 0) return tasks;
      }
    } catch {
      // fall through
    }
  }

  // 2. An array cut off by the token cap — salvage the complete string literals
  //    rather than letting `["Identify the top 3` become a "sub-task".
  if (raw.trimStart().startsWith("[")) {
    const salvaged = clean([...raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]));
    return salvaged.length > 0 ? salvaged : [fallback];
  }

  // 3. Plain prose or a bulleted list.
  const lines = clean(
    raw
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
          .replace(/^["']|["'],?$/g, "")
          .trim(),
      )
      .filter((line) => line.length > 3),
  );

  return lines.length > 0 ? lines : [fallback];
}

function truncate(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function listSubTasks(tasks: string[]): string {
  return tasks.map((task, index) => `${index + 1}. ${task}`).join("\n");
}

export async function runPipeline(
  userMessage: string,
  emit: Emit,
  signal: AbortSignal,
): Promise<void> {
  let steps = initialSteps();
  const publish = () => emit({ type: "trace", steps: steps.map((s) => ({ ...s })) });

  const setStatus = (id: string, status: StepStatus, description?: string) => {
    steps = steps.map((s) =>
      s.id === id ? { ...s, status, description: description ?? s.description } : s,
    );
    publish();
  };

  publish();
  emit({ type: "status", text: "Coordinating agents to work through your request…" });

  // ---- 1. Planner (Gemini) — break the request into sub-tasks -------------
  setStatus("planner", "running");
  let subTasks: string[] = [userMessage];
  try {
    const raw = await callModel({
      model: geminiModel,
      system:
        "You are the planner in a multi-agent system. Break the user's request into at most " +
        `${MAX_RESEARCHERS} concrete, independently researchable sub-tasks. ` +
        "Reply with ONLY a JSON array of short strings. No prose, no markdown fences.",
      prompt: userMessage,
      signal,
      maxOutputTokens: 1500,
    });
    subTasks = parseSubTasks(raw, userMessage);
    setStatus("planner", "done", `Split the request into ${subTasks.length} sub-task${subTasks.length === 1 ? "" : "s"}`);
    emit({
      type: "agent_output",
      label: "Planner",
      text: `I broke the request into ${subTasks.length} step${subTasks.length === 1 ? "" : "s"}:\n${listSubTasks(subTasks)}`,
    });
  } catch (error) {
    // Degrade to a single sub-task rather than aborting the whole run.
    logStepFailure("planner", error);
    setStatus("planner", "error", "Planning failed — researching the request as-is");
    subTasks = [userMessage];
    emit({
      type: "agent_output",
      label: "Planner",
      text: "The planning model was unavailable, so the request will be researched as one complete task.",
    });
  }

  // ---- 2. Researchers (Groq, sequential so every result is visible) -------
  const researcherSteps: TraceStep[] = subTasks.map((task, i) => ({
    ...makeStep(
      `researcher-${i + 1}`,
      subTasks.length === 1 ? "Researcher" : `Researcher ${i + 1}`,
      MODEL_LABELS.groq,
      truncate(task),
      REASONS.researcher,
    ),
    status: "pending" as StepStatus,
  }));

  const researcherIndex = steps.findIndex((s) => s.id === "researcher");
  steps =
    researcherIndex === -1
      ? [...steps, ...researcherSteps]
      : [
          ...steps.slice(0, researcherIndex),
          ...researcherSteps,
          ...steps.slice(researcherIndex + 1),
        ];
  publish();

  const findings: { task: string; notes: string }[] = [];
  for (const [i, task] of subTasks.entries()) {
    const id = `researcher-${i + 1}`;
    const label = subTasks.length === 1 ? "Researcher" : `Researcher ${i + 1}`;
    setStatus(id, "running");
    try {
      const notes = await callModel({
        model: groqModel,
        system:
          "You are a research worker in a multi-agent system. Answer the sub-task with dense, " +
          "factual notes in at most 6 short bullet points. State plainly when you are unsure. " +
          "No preamble, no conclusion.",
        prompt: `Overall request: ${userMessage}\n\nYour sub-task: ${task}`,
        signal,
        maxOutputTokens: 500,
      });
      findings.push({ task, notes });
      setStatus(id, "done");
      emit({ type: "agent_output", label, text: notes });
    } catch (error) {
      logStepFailure(id, error);
      setStatus(id, "error", `${truncate(task, 70)} — no result`);
      findings.push({ task, notes: "" });
      emit({
        type: "agent_output",
        label,
        text: "This research step could not return a result. The remaining agents will continue with the available information.",
      });
    }
  }

  const research = findings
    .filter((f) => f.notes)
    .map((f) => `## ${f.task}\n${f.notes}`)
    .join("\n\n");

  // ---- 3. Critic (Gemini) — review the research before it's written up ----
  setStatus("critic", "running");
  let critique = "";
  if (!research) {
    setStatus("critic", "error", "Nothing to review — research produced no notes");
    emit({
      type: "agent_output",
      label: "Critic",
      text: "There were no research notes to review, so the writer will produce a best-effort answer from the original request.",
    });
  } else {
    try {
      critique = await callModel({
        model: geminiModel,
        system:
          "You are the critic in a multi-agent system. Review the research notes against the " +
          "user's request. List only concrete gaps, likely errors, and things the final answer " +
          "must be careful about. At most 5 short bullets. If the notes are solid, say so briefly.",
        prompt: `User's request:\n${userMessage}\n\nResearch notes:\n${research}`,
        signal,
        maxOutputTokens: 1500,
      });
      setStatus("critic", "done");
      emit({ type: "agent_output", label: "Critic", text: critique });
    } catch (error) {
      logStepFailure("critic", error);
      setStatus("critic", "error", "Review step failed — writing up without it");
      emit({
        type: "agent_output",
        label: "Critic",
        text: "The review step was unavailable, so the writer will continue using the research notes directly.",
      });
    }
  }

  // ---- 4. Writer (Gemini, streamed; Groq as fallback) --------------------
  setStatus("writer", "running");

  const writerSystem =
    "You are the writer in a multi-agent system. Using the research notes and the critic's " +
    "feedback, write the final answer directly to the user. Be clear and well-structured, use " +
    "short paragraphs, and do not mention the agents, the notes, or this process. If the " +
    "material is thin, answer as best you can and say what is uncertain. " +
    // The client renders plain text, so markdown syntax would show up literally.
    "Write plain text only: no markdown headings, bold, italics, or code fences. " +
    "If you need a list, start each line with '- '.";
  const writerPrompt = [
    `User's request:\n${userMessage}`,
    research ? `Research notes:\n${research}` : "Research notes: (none available)",
    critique ? `Critic's feedback:\n${critique}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let emitted = 0;

  const streamAnswer = async (model: LanguageModel) => {
    const before = emitted;
    const result = streamText({
      model,
      system: writerSystem,
      prompt: writerPrompt,
      temperature: 0.5,
      maxOutputTokens: 4000,
      abortSignal: timeoutSignal(signal),
    });
    for await (const chunk of result.textStream) {
      if (chunk) {
        emitted += chunk.length;
        emit({ type: "delta", text: chunk });
      }
    }
    // An empty stream is a failure, not a success: streamText resolves without
    // throwing when the provider rejects the request mid-stream.
    if (emitted === before) {
      throw new Error("model produced no output");
    }
  };

  try {
    await streamAnswer(geminiModel);
    setStatus("writer", "done");
  } catch (primaryError) {
    if (signal.aborted) throw primaryError;
    logStepFailure("writer", primaryError);

    if (emitted > 0) {
      // Already streamed part of an answer — retrying would duplicate text.
      setStatus("writer", "error", "The answer was cut off mid-stream");
      emit({
        type: "delta",
        text: "\n\n(The answer was cut off — the model stream failed partway through.)",
      });
      emit({ type: "done" });
      return;
    }

    setStatus("writer", "running", "Gemini unavailable — retrying on Groq");
    try {
      await streamAnswer(groqModel);
      steps = steps.map((s) =>
        s.id === "writer"
          ? {
              ...s,
              model: MODEL_LABELS.groq,
              status: "done",
              description: "Compiled the final answer",
              reason: "Selected as a fast fallback when Gemini was unavailable",
            }
          : s,
      );
      publish();
    } catch (fallbackError) {
      logStepFailure("writer/groq-fallback", fallbackError);
      setStatus("writer", "error", "Both models failed to produce an answer");
      emit({
        type: "error",
        message:
          "The agents couldn't finish this one — the model providers didn't respond. Try again in a moment.",
      });
      return;
    }
  }

  emit({ type: "done" });
}
