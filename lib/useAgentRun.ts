"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TraceStep } from "./agent-types";
import { UNEXPECTED_RESPONSE, checkAgentResponse, readEvents } from "./agent-transport";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Shown in place of content while the pipeline runs and nothing has streamed yet. */
  status?: string;
  error?: boolean;
};

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

        // A response that isn't an agent stream is an outage, not an empty run.
        const transportError = checkAgentResponse(response);
        if (transportError || !response.body) {
          patchAssistant({
            content: transportError ?? UNEXPECTED_RESPONSE,
            status: undefined,
            error: true,
          });
          return;
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
