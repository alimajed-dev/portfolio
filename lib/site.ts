/** Site-level content and config. Editing this file is the whole "add a project" flow. */

export const OWNER = {
  name: "Ali Majed",
  initials: "AM",
  email: "alimajed93@gmail.com",
  /**
   * Swap the photo by dropping a new file in /public and pointing this here.
   * If the file is missing the avatar falls back to `initials` on its own.
   */
  avatarSrc: "/avatar.png",
  bio: "I build software end-to-end — from scoping the problem to shipping and running it in production — with a focus on two things: agentic AI systems that coordinate multiple models to get real work done, and frontend-first web development that doesn't lose sight of the whole lifecycle.",
} as const;

export const SKILLS = [
  {
    eyebrow: "Agentic AI",
    title: "Multi-model orchestration",
    body: "Planning, routing and reviewing work across a team of models — picking the right one for each sub-task, not defaulting to one.",
  },
  {
    eyebrow: "Web Development",
    title: "Full lifecycle, frontend-first",
    body: "Scoping, designing, building and deploying real products — with the frontend craft to make the result feel right.",
  },
] as const;

export type SocialLink = {
  id: string;
  label: string;
  href: string;
  icon: "mail" | "linkedin" | "x" | "youtube" | "github";
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "email",
    label: OWNER.email,
    href: `mailto:${OWNER.email}`,
    icon: "mail",
  },
  {
    id: "linkedin",
    label: "linkedin.com/in/ali-majed",
    href: "https://www.linkedin.com/in/ali-majed/",
    icon: "linkedin",
  },
  { id: "x", label: "x.com/AliMajed93", href: "https://x.com/AliMajed93", icon: "x" },
  {
    id: "youtube",
    label: "youtube.com/@alimajed93",
    href: "https://www.youtube.com/@alimajed93",
    icon: "youtube",
  },
  {
    id: "github",
    label: "github.com/alimajed-dev",
    href: "https://github.com/alimajed-dev",
    icon: "github",
  },
];

export type Project = {
  id: string;
  name: string;
  subtitle: string;
};

/** v1 has exactly one project; the sidebar renders one nav item per entry here. */
export const PROJECTS: Project[] = [
  {
    id: "agent-orchestration-demo",
    name: "Agent Orchestration Demo",
    subtitle: "Multi-agent workflow demo",
  },
];

/** The "Process" tab — the case study of how this site itself was built. */
export const PROCESS_STEPS = [
  {
    phase: "Requirements",
    tool: "Claude (conversation)",
    description: "Scoped through a Claude conversation.",
  },
  {
    phase: "Design",
    tool: "Claude Design",
    description: "Layout and states designed directly from the brief.",
  },
  {
    phase: "Implementation",
    tool: "Claude Code",
    description: "Built the working multi-agent demo.",
  },
  {
    phase: "Review",
    tool: "Automated review agent",
    description: "An automated review-agent pass before merge.",
  },
  {
    phase: "Deployment",
    tool: "GitHub → Railway",
    description: "Pushed to GitHub, deployed on Railway.",
  },
] as const;
