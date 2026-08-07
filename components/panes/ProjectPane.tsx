"use client";

import { CornerDownLeft, PenLine, Sparkles, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/useAgentRun";
import { MAX_INPUT_LENGTH } from "@/lib/content-filter";
import type { Project } from "@/lib/site";

type Props = {
  project: Project;
  messages: ChatMessage[];
  running: boolean;
  onSend: (text: string) => void;
};

const SUGGESTION =
  "Research the top 3 competitors for a Swiss watch startup and draft a positioning summary.";

export function ProjectPane({ project, messages, running, onSend }: Props) {
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
      <h1 className="sr-only">{project.name}</h1>
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-20 flex w-full max-w-[470px] flex-col items-center text-center lg:mt-16">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-tint text-accent">
              <Sparkles size={24} strokeWidth={1.7} aria-hidden />
            </span>
            <p className="mb-3 text-[20px] font-semibold text-ink">Ask the agents anything.</p>
            <p className="mb-5 text-[13px]/[1.55] text-neutral-600 sm:text-[14px]/[1.55]">
              A planner, focused researchers, a critic and a writer run across two model providers.
              Watch them work in the Live panel.
            </p>
            <button
              type="button"
              onClick={() => onSend(SUGGESTION)}
              disabled={running}
              className="group flex w-full items-center gap-3 rounded-lg border border-line-strong bg-panel px-3 py-2.5 text-left text-[12px]/[1.35] text-ink transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-accent/60 hover:bg-panel-raised active:translate-y-0 disabled:opacity-50 sm:w-auto sm:min-w-[360px]"
            >
              <Terminal size={16} strokeWidth={1.7} aria-hidden className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
              <span>&quot;{SUGGESTION}&quot;</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div
                    key={message.id}
                    className="max-w-[84%] self-end rounded-[12px_12px_2px_12px] border border-accent bg-bg px-3 py-2.5 text-[13px]/[1.5] whitespace-pre-wrap sm:max-w-[86%]"
                  >
                    {message.content}
                  </div>
                );
              }

              const system = !message.label || message.label === "Agent team";
              const writer = /writer|final/i.test(message.label ?? "");
              const label = system
                ? "System"
                : writer
                  ? "Writer (Gemini 3.6 Flash)"
                  : message.label;

              return (
                <div key={message.id} className="flex max-w-full items-start gap-2.5 self-start">
                  <span
                    className={[
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-panel",
                      writer ? "text-success" : "text-accent",
                    ].join(" ")}
                  >
                    {writer ? <PenLine size={15} strokeWidth={1.8} aria-hidden /> : <Sparkles size={15} strokeWidth={1.8} aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={writer ? "mb-1.5 text-xs font-semibold text-success" : "mb-1.5 text-xs font-semibold text-accent"}>
                      {label}
                    </p>
                    <div
                      className={[
                        "rounded-xl border border-line bg-panel px-3 py-2.5 text-[13px]/[1.55] whitespace-pre-wrap sm:px-4 sm:py-3 sm:text-[14px]/[1.6]",
                        message.error ? "text-error" : "text-neutral-600",
                      ].join(" ")}
                    >
                      {message.status ? (
                        <span className="text-neutral-700">{message.status}</span>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        className="shrink-0 px-4 pb-10 pt-2 sm:px-6 sm:pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition-colors duration-150 focus-within:border-accent">
          <label htmlFor="agent-input" className="sr-only">Message the agent</label>
          <textarea
            id="agent-input"
            data-agent-composer-input
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
            placeholder={running ? "Agents executing. Please wait…" : "Message the agent…"}
            className="max-h-40 min-h-6 min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-base leading-6 text-ink outline-none placeholder:text-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-neutral-400 md:text-sm"
          />
          <button
            type="submit"
            disabled={running || input.trim().length === 0}
            aria-label={running ? "Agents are running" : "Send message"}
            className="flex size-6 shrink-0 items-center justify-center border-0 bg-transparent text-accent transition-[color,transform] duration-150 hover:text-accent-hover active:scale-90 active:text-accent-active disabled:cursor-not-allowed disabled:text-neutral-500"
          >
            <CornerDownLeft size={18} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
