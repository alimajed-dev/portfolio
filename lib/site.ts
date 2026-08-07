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
  bio: "I'm a full-stack software engineer and a solutions architect with a passion for building practical AI systems. I enjoy turning complex ideas into reliable products, whether that's orchestrating AI agents, designing scalable architectures, or shipping web applications people actually use.",
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
    title: "AI that gets work done",
    body: "I build AI systems that plan, use tools, collaborate, and execute real tasks to get the job done.",
  },
  {
    eyebrow: "Web Development",
    title: "From idea to production",
    body: "I build modern web applications across the full stack—from APIs and databases to intuitive interfaces, deployment, and everything needed to keep them running smoothly.",
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
  cardEyebrow: string;
  cardTitle: string;
  cardBody: string;
};

/** v1 has exactly one project; the sidebar renders one nav item per entry here. */
export const PROJECTS: Project[] = [
  {
    id: "agent-orchestration-demo",
    name: "Agent Orchestration Demo",
    subtitle: "Multi-agent workflow demo",
    cardEyebrow: "Project",
    cardTitle: "Agent orchestration in action",
    cardBody:
      "Use the demo to see how agents are orchestrated across planning, research, review, and writing, with the right model chosen for each step.",
  },
];

export type ProcessStep = {
  phase: string;
  /** The tool shown in the process badge, e.g. "Claude Code". */
  tool: string;
  /** Model used, retained as part of the public process record. */
  model: string;
  description: string;
  /** First-person aside, revealed on demand. Written to be read, not skimmed. */
  why: string;
};

/** The "Step by step" tab — the case study of how this site itself was built. */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    phase: "Requirements",
    tool: "Claude",
    model: "Sonnet 5",
    description: "Defined the audience, goals, scope, and v1 boundaries before writing code.",
    why: "I used Claude Sonnet 5 to turn a normal conversation into a focused plan for what the site needed to prove and what could wait.",
  },
  {
    phase: "Design",
    tool: "Claude + Figma AI",
    model: "Figma MCP",
    description: "Turned the agreed direction into an approved Figma design and implementation reference.",
    why: "After agreeing on the design direction, colour palette, and look and feel, I asked Claude to write the design prompt. I used it in Figma AI, then connected Claude to the approved frames through MCP for implementation.",
  },
  {
    phase: "Implementation",
    tool: "Claude Code",
    model: "Sonnet 5 + Opus 5",
    description: "Built the interface, multi-agent workflow, streaming, and supporting backend.",
    why: "I used Claude Sonnet 5 for most implementation work and Opus 5 for the more complex orchestration and streaming logic.",
  },
  {
    phase: "Cross-model review",
    tool: "ChatGPT",
    model: "GPT-5.5 Thinking",
    description: "Reviewed the finished application with an independent model from another lab.",
    why: "I used ChatGPT GPT-5.5 Thinking to get a different perspective and catch issues the implementation model might miss.",
  },
  {
    phase: "Fixes",
    tool: "Claude Code",
    model: "Sonnet 5 + Opus 5",
    description: "Resolved the review findings and refined the product experience.",
    why: "I returned to Claude Code with Sonnet 5 and Opus 5 to fix the findings, verify the behavior, and polish the remaining details.",
  },
  {
    phase: "Validation",
    tool: "ChatGPT",
    model: "GPT-5.5 Thinking",
    description: "Rechecked every fix against the original findings.",
    why: "I used ChatGPT GPT-5.5 Thinking for a second review pass to confirm that each issue was resolved rather than only hidden.",
  },
  {
    phase: "Deployment",
    tool: "Claude",
    model: "Sonnet 5",
    description: "Deployed through GitHub and Railway and connected the domain.",
    why: "I used Claude Sonnet 5 to guide the deployment, environment configuration, usage limits, and DNS setup.",
  },
];
