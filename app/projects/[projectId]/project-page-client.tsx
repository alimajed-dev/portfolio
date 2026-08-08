"use client";

import { ProjectPane } from "@/components/panes/ProjectPane";
import { PixelExperience } from "@/components/experiences/PixelExperience";
import { useAgentRunContext } from "@/lib/agent-run-context";
import type { Project } from "@/lib/site";

/** Pulls the chat state that actually lives in `AppShell` back out of context. */
export function ProjectPageClient({ project }: { project: Project }) {
  const { messages, running, send } = useAgentRunContext();

  if (project.experience === "pixels") {
    return <PixelExperience />;
  }

  return (
    <ProjectPane
      project={project}
      messages={messages}
      running={running}
      onSend={send}
    />
  );
}
