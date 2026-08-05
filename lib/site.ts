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
  bio: "I build software end-to-end and I'm at home anywhere in the stack — data, backend, frontend, and the part where it actually goes live and stays up. Two things I keep coming back to: AI agents that get real work done instead of just planning it, and web apps that feel good to use.",
} as const;

export type Skill = {
  eyebrow: string;
  title: string;
  body: string;
  /** Optional tag row rendered under the body. */
  stack?: string[];
};

export const SKILLS: Skill[] = [
  {
    eyebrow: "Agentic AI",
    title: "Orchestration that ships work",
    body: "Planning, routing and reviewing across a team of models — then actually doing the thing. Agents that call tools, run tasks in parallel and hand off to each other, with the right model on each step instead of one model for everything.",
  },
  {
    eyebrow: "Web Development",
    title: "Full stack, scope to production",
    body: "Comfortable across the whole thing — API and data layer, interface, deployment, and keeping it running afterwards.",
    stack: ["TypeScript", "React", "Next.js", "Node", "Tailwind", "PostgreSQL", "REST APIs", "CI/CD"],
  },
];

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
