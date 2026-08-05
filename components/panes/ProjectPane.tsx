"use client";

import { ArrowUp, PanelRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/useAgentRun";
import { MAX_INPUT_LENGTH } from "@/lib/content-filter";
import type { Project } from "@/lib/site";

type Props = {
  project: Project;
  messages: ChatMessage[];
  running: boolean;
  onSend: (text: string) => void;
  onOpenPanel: () => void;
};

const SUGGESTION =
  "Research the top 3 competitors for a Swiss watch startup and draft a positioning summary.";

export function ProjectPane({ project, messages, running, onSend, onOpenPanel }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!running) inputRef.current?.focus();
  }, [running]);

  const submit = () => {
    const text = input.trim();
    if (!text || running) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-6 sm:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="mb-0.5 truncate text-lg font-semibold">{project.name}</h1>
          <p className="text-[13px] text-neutral-700">{project.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenPanel}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-700 transition-[transform,color,background-color] duration-150 ease-out hover:scale-105 hover:bg-[rgb(32_30_29_/_0.05)] hover:text-ink active:scale-95 lg:hidden"
          aria-label="Show agent trace"
        >
          <PanelRight size={18} strokeWidth={1.6} aria-hidden />
        </button>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 sm:p-8">
        {messages.length === 0 ? (
          <div className="m-auto max-w-[420px] text-center">
            <p className="mb-2 text-[15px] font-semibold">Ask the agents anything.</p>
            <p className="mb-5 text-[13px]/[1.55] text-ink/[0.7]">
              A planner, focused researchers, a critic and a writer run across two model providers.
              Watch them work in the Live panel.
            </p>
            <button
              type="button"
              onClick={() => onSend(SUGGESTION)}
              disabled={running}
              className="rounded-[10px] border border-line-strong px-3.5 py-2 text-left text-[13px] text-ink/[0.8] transition-colors duration-150 ease-out hover:bg-surface disabled:opacity-50"
            >
              {SUGGESTION}
            </button>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div
                key={message.id}
                className="max-w-[85%] self-end rounded-[12px_12px_2px_12px] bg-surface px-4 py-3 text-sm/[1.55] whitespace-pre-wrap sm:max-w-[65%]"
              >
                {message.content}
              </div>
            ) : (
              <div
                key={message.id}
                className="flex max-w-full flex-col gap-1.5 self-start sm:max-w-[75%]"
              >
                <p className="text-[11px] font-semibold tracking-[0.06em] text-neutral-600 uppercase">
                  {message.label ?? "Assistant"}
                </p>
                {message.status ? (
                  <p className="flex items-baseline gap-2 text-sm/[1.6] text-ink/[0.75]">
                    <span className="relative -top-px size-1.5 flex-none animate-pulse rounded-full bg-accent" />
                    {message.status}
                  </p>
                ) : (
                  <p
                    className={[
                      "text-sm/[1.6] whitespace-pre-wrap",
                      message.error ? "text-neutral-800" : "text-ink/[0.85]",
                    ].join(" ")}
                  >
                    {message.content}
                  </p>
                )}
              </div>
            ),
          )
        )}
      </div>

      <form
        className="flex shrink-0 items-end gap-3 border-t border-line px-6 py-5 sm:px-8"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="agent-input" className="sr-only">
          Message the agent
        </label>
        <textarea
          id="agent-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={MAX_INPUT_LENGTH}
          disabled={running}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Message the agent…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-[10px] border border-line-strong bg-bg px-2.5 py-2.5 text-sm placeholder:text-neutral-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={running || input.trim().length === 0}
          aria-label={running ? "Agents are running" : "Send message"}
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition-[background-color,transform] duration-150 ease-out hover:bg-accent-hover active:scale-95 active:bg-accent-active disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </form>
    </div>
  );
}
