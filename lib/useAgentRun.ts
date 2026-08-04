"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, TraceStep } from "./agent-types";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Shown in place of content while the pipeline runs and nothing has streamed yet. */
  status?: string;
  error?: boolean;
};

function isAgentEvent(value: unknown): value is AgentEvent {
  return typeof value === "object" && value !== null && typeof (value as AgentEvent).type === "string";
}

/** Splits an SSE byte stream into `data:` payloads. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
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

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

export function useAgentRun() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || abortRef.current) return;

      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: text },
        { id: assistantId, role: "assistant", content: "", status: "Starting the agent run…" },
      ]);
      setSteps([]);
      setRunning(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (patch: Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
        );

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
          signal: controller.signal,
        });

        if (!response.body) {
          throw new Error("no response body");
        }

        let streamed = false;
        let failed = false;

        for await (const event of readEvents(response.body)) {
          switch (event.type) {
            case "trace":
              setSteps(event.steps);
              break;
            case "status":
              if (!streamed) patchAssistant({ status: event.text });
              break;
            case "delta":
              streamed = true;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.text, status: undefined }
                    : m,
                ),
              );
              break;
            case "error":
              failed = true;
              patchAssistant({ content: event.message, status: undefined, error: true });
              break;
            case "done":
              break;
          }
        }

        if (!streamed && !failed) {
          patchAssistant({
            content: "The agents finished without producing an answer. Try rephrasing your request.",
            status: undefined,
            error: true,
          });
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          patchAssistant({
            content: "Couldn't reach the agents — check your connection and try again.",
            status: undefined,
            error: true,
          });
        }
      } finally {
        abortRef.current = null;
        setRunning(false);
      }
    },
    [],
  );

  return { messages, steps, running, send };
}
