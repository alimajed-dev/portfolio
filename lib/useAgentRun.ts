"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TraceStep } from "./agent-types";
import { UNEXPECTED_RESPONSE, checkAgentResponse, readEvents } from "./agent-transport";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Identifies the agent contribution or final response. */
  label?: string;
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

      const appendAssistant = (message: Omit<ChatMessage, "id" | "role">) =>
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", ...message },
        ]);

      let hasVisibleProgress = false;

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
        let finalId: string | null = null;
        let latestStatus = "Coordinating agents to work through your request…";
        let statusSettled = false;

        const settleStatus = () => {
          if (statusSettled) return;
          statusSettled = true;
          hasVisibleProgress = true;
          patchAssistant({ content: latestStatus, status: undefined, label: "Agent team" });
        };

        const showError = (message: string) => {
          if (statusSettled) appendAssistant({ content: message, error: true });
          else patchAssistant({ content: message, status: undefined, error: true });
        };

        for await (const event of readEvents(response.body)) {
          switch (event.type) {
            case "trace":
              setSteps(event.steps);
              break;
            case "status":
              latestStatus = event.text;
              if (!statusSettled) patchAssistant({ status: event.text });
              break;
            case "agent_output":
              settleStatus();
              appendAssistant({ label: event.label, content: event.text });
              break;
            case "delta":
              settleStatus();
              streamed = true;
              if (!finalId) {
                finalId = nextId();
                const id = finalId;
                setMessages((prev) => [
                  ...prev,
                  { id, role: "assistant", label: "Final answer", content: event.text },
                ]);
              } else {
                const id = finalId;
                setMessages((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, content: m.content + event.text } : m)),
                );
              }
              break;
            case "error":
              failed = true;
              showError(event.message);
              break;
            case "done":
              break;
          }
        }

        if (!streamed && !failed) {
          showError("The agents finished without producing an answer. Try rephrasing your request.");
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          const message = "Couldn't reach the agents — check your connection and try again.";
          if (hasVisibleProgress) appendAssistant({ content: message, error: true });
          else patchAssistant({ content: message, status: undefined, error: true });
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
