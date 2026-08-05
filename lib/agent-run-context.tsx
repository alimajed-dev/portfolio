"use client";

import { createContext, useContext } from "react";
import type { ChatMessage } from "./useAgentRun";

/**
 * Bridges the single `useAgentRun()` instance — owned by `AppShell` so it
 * survives navigation between routes — down to the project route's page
 * component. A page component only receives `params`/`searchParams` from
 * Next.js, not arbitrary props from its layout, so this is how `ProjectPane`
 * (rendered by `app/projects/[projectId]/page.tsx`) reaches the chat state
 * that actually lives in the shared shell.
 */
type AgentRunContextValue = {
  messages: ChatMessage[];
  running: boolean;
  send: (text: string) => void;
  /** Opens the mobile agent-trace drawer — the project pane's "Show agent trace" button. */
  openPanel: () => void;
};

const AgentRunContext = createContext<AgentRunContextValue | null>(null);

export function AgentRunContextProvider({
  value,
  children,
}: {
  value: AgentRunContextValue;
  children: React.ReactNode;
}) {
  return <AgentRunContext.Provider value={value}>{children}</AgentRunContext.Provider>;
}

export function useAgentRunContext(): AgentRunContextValue {
  const ctx = useContext(AgentRunContext);
  if (!ctx) {
    throw new Error("useAgentRunContext must be used inside AppShell's <main>, e.g. a project page.");
  }
  return ctx;
}
