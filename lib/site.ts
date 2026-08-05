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

export type ProcessStep = {
  phase: string;
  /** The tool used, e.g. "Claude Code". */
  tool: string;
  /** Model badge — same styling as the Live trace badges. */
  model: string;
  description: string;
  /** First-person aside, revealed on demand. Written to be read, not skimmed. */
  why: string;
};

/** The "Process" tab — the case study of how this site itself was built. */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    phase: "Requirements",
    tool: "Claude",
    model: "Sonnet 5",
    description: "Scoped in conversation before any code.",
    why: "I talked it through like a normal conversation — what the site had to prove, who'd actually be reading it, what wasn't worth building for v1. Scoping is thinking out loud, not a hard reasoning problem, so there was no reason to reach for anything heavier.",
  },
  {
    phase: "Design",
    tool: "Claude Design",
    model: "Opus 4.7",
    description: "Brief turned into the five screens.",
    why: "Going from a written brief to screens that actually look right is the one step where I wanted the strongest vision model available. It came back with all five states, and those mockups became the source of truth for every colour and spacing value in the code.",
  },
  {
    phase: "Implementation",
    tool: "Claude Code",
    model: "Sonnet 5 + Opus 5",
    description: "Built the site and the multi-agent backend.",
    why: "Sonnet 5 did most of the building. I switched to Opus 5 for the genuinely tricky parts — the multi-agent orchestration and the streaming — where the extra capability earns its keep. No point paying for it to write a nav bar.",
  },
  {
    phase: "Cross-model review",
    tool: "ChatGPT",
    model: "GPT-5.5 Thinking",
    description: "Reviewed by a model from a different lab.",
    why: "Instead of asking Claude to grade its own homework, I brought in ChatGPT as a second, unrelated opinion — different company, different training, so it actually catches different things.",
  },
  {
    phase: "Fixes",
    tool: "Claude Code",
    model: "Sonnet 5 + Opus 5",
    description: "Worked through everything the review flagged.",
    why: "Back to Claude Code to actually fix what came out of the review. Having the thing that wrote the code fix the code is fine — it's the reviewing you don't want it marking itself on.",
  },
  {
    phase: "Validation",
    tool: "ChatGPT",
    model: "GPT-5.5 Thinking",
    description: "Re-checked the fixes against the original notes.",
    why: "Same reviewer, second pass. I wanted it to confirm the fixes actually solved what it flagged, rather than just making the warning go away — it's easy to patch the symptom and call it done.",
  },
  {
    phase: "Deployment",
    tool: "Claude",
    model: "Sonnet 5",
    description: "GitHub to Railway, plus domain DNS.",
    why: "Pushing to GitHub, wiring up Railway, setting the env vars and usage caps, then pointing the domain's DNS at it. Mostly careful step-by-step work rather than hard problems, so Sonnet was the right call.",
  },
];
