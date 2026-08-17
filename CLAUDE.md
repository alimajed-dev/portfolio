# Portfolio Site — Project Context for Claude Code

This file is the handoff from a requirements + design phase done in a Claude
chat session and Claude Design. Read this fully before writing code — it has
everything needed to implement, review, push, and deploy without further
back-and-forth with the user unless something is genuinely ambiguous.

Full docs: `docs/requirements.md`, `docs/design-brief.md`, and the approved
visual reference `docs/design/mockup.html` (open it in a browser — inline
styles in that file are the source of truth for colors/spacing/radius/type,
not any other design-system file that might be lying around).

## What this project is
Ali Majed's personal portfolio site. Purpose: prove two skills to people
evaluating him for freelance/contract work — (1) agentic AI / multi-model
orchestration, (2) full-lifecycle web development, frontend-first. He can't
show real client work (confidential), so the portfolio itself doubles as the
proof: a working multi-agent demo, and a case study of how the whole site
was built using Claude tools end to end.

## Status
- Requirements: done (`docs/requirements.md`)
- Design: done, approved by user (`docs/design-brief.md`, `docs/design/mockup.html`)
- Tech stack: decided (below)
- Implementation: **done and live** — the sections below now describe what
  exists, not what to build. Treat them as the contract to preserve.
- Review: cross-model review pass done; findings implemented, with automated
  tests and CI added (see "Review" and "Validation" below)
- Deployment: live on Railway at majedali.com

Note for other coding agents: `AGENTS.md` is a pointer to this file, not a
second handoff. Keep it that way — two divergent handoffs is exactly the
problem it was collapsed to fix.

## Tech stack (already decided, do not deviate without asking)
- **Framework:** Next.js (React, TypeScript). Runs as a normal persistent
  Node server — NOT deployed on Vercel, specifically because Vercel's free
  tier caps function execution around 60s and would cut off long streamed
  agent runs mid-demo. Railway runs it as a long-lived process instead, so
  build it to run via `next build && next start`, not as edge/serverless
  functions.
- **Styling:** Tailwind CSS.
- **Interactive 3D:** React Three Fiber and Three.js. The Pixels project uses a
  dynamically loaded procedural 3D stage so the main portfolio and agent demo
  do not pay the WebGL bundle cost.
- **Model calls / streaming:** Vercel AI SDK (`ai` package + `@ai-sdk/google`
  and a Groq provider) — gives a unified streaming interface across Gemini
  and Groq so the agent pipeline can stream step-by-step to the frontend
  regardless of which model is handling a given step. (This is just a
  library; using it doesn't imply Vercel hosting.)
- **Live transport:** Server-Sent Events (SSE), one-directional
  server→browser. No WebSockets needed.
- **Rate limiting:** daily usage is persisted on the Railway `/data` volume
  using keyed hashes rather than raw IP addresses; active concurrency slots
  remain in memory (`lib/rate-limit.ts`). Per IP:
  5 runs/day, 1 concurrent. Across all visitors: 200 runs/day, 6 concurrent —
  the per-IP key is only as trustworthy as the proxy chain, so the global caps
  are what actually bound free-tier spend. The IP is read from the *rightmost*
  `X-Forwarded-For` entry (the hop Railway appends); `TRUSTED_PROXY_HOPS`
  adjusts that if another proxy is ever put in front.
  **This assumes exactly one Railway instance** — the attached volume and
  in-process concurrency locks are not a distributed rate limiter. Use Redis
  or another atomic shared store before scaling horizontally.
- **Run budget:** each model call is capped at 60s (`lib/orchestrator.ts`) and
  the whole run at 180s (`AGENT_RUN_TIMEOUT_MS`, in `app/api/agent/route.ts`).
- **Icons:** Lucide (`lucide-react`) — matches the mockup exactly.
- **Font:** Archivo, **self-hosted** at `app/fonts/archivo-latin-variable.woff2`
  via `next/font/local`. Not `next/font/google`: that fetches from Google at
  build time, so a restricted CI runner or a Fonts outage fails the build before
  app code compiles. Keep it local.
- **Node:** pinned by `.nvmrc` (22, the LTS CI and Railway use). `engines` in
  `package.json` is the compatibility floor, not the pin.
- **No database, no auth, no payments** — out of scope for v1, see
  `docs/requirements.md`.

## Design reference — quick token sheet
(Updated from the approved Figma light-mode frames. Components and behavior
implemented after the original mockups remain authoritative; Figma supplies
the shared palette and surfaces, not older interaction/layout details.)
- Default mode: **light**
- Background: `#ffffff` (main), `#f7f8fa` (sidebar/right panel)
- Raised surfaces: `#ebedf3` (cards/inputs), `#e2e5ec` (nested/hover surfaces)
- Text: `#1a1d26` primary, `#5f6672` secondary, `#8b919d` muted
- Accent (primary, buttons/active/links): `#1A73E8`, hover `#1765CC`, active `#1558B0`
- Accent tint: `rgba(26,115,232,0.08)`
- Borders/dividers: `rgba(0,0,0,0.08–0.12)`
- The previous dark palette remains under `html[data-theme="dark"]` in
  `app/globals.css`. The header theme control shows a moon while light is
  active (switch to dark) and a sun while dark is active (switch to light),
  and persists the visitor's explicit choice. No old Figma component markup
  should replace later product changes.
- Font: `"Archivo", system-ui, sans-serif`
- Radius: 8px (buttons/nav items/icons), 10–12px (cards/panels/inputs), 12px 12px 2px 12px (chat bubble)
- Shadow: subtle only — `0 1px 3px rgba(32,30,29,0.08)` on the main app frame
- Icon micro-interactions: hover = slight scale (~1.05–1.08x) + subtle bg/color shift; active/click = scale down (~0.9–0.98x). Keep transitions ~150ms ease. Already implemented as inline hover in the original Claude Design export — recreate as CSS `:hover`/`:active` or Tailwind's `hover:`/`active:` utilities.

## Layout — build these as one app, not separate pages
3-pane layout, client-side navigation (no full page reloads):
- **Left sidebar** (264px expanded / 72px collapsed, user-togglable): avatar
  (32x32, rounded-8px, initials "AM" as fallback — **user will supply a real
  photo to replace this, leave it swappable, e.g. `/public/avatar.jpg` with
  a graceful fallback to initials if the file doesn't exist**), name "Ali
  Majed", collapse/expand toggle button. Below: "Contact" nav item (single
  entry). Below that, "Projects" section header + one nav item per project —
  current projects are "Agent Orchestration Demo" and "How Pixels Create Color".
- **Middle pane:** changes based on sidebar selection.
  - Nothing selected / default: bio + two skill cards (Agentic AI /
    Web Development, copy already in the mockup) + "Get in touch" CTA button.
  - Contact selected: "Let's build something." heading + short line + email
    CTA button + link rows for email, LinkedIn (linkedin.com/in/ali-majed),
    X (x.com/AliMajed93), YouTube (youtube.com/@alimajed93), GitHub
    (github.com/alimajed-dev). Direct links only, no contact form.
  - Agent demo selected: chat-style interface — message bubbles, input box at
    bottom, "Message the agent…" placeholder.
  - How Pixels Create Color selected: a full-width, scene-driven React Three
    Fiber experience covering pixels, RGB subpixels, additive color, and an
    interactive color mixer. Its project panel shows only its concise build
    process and 3D/animation stack; it does not show the agent trace.
- **Right panel** (360px, visible for both projects):
  - The agent demo has the Live / Build Process toggle described below.
  - The Pixels project has only Build Process: one procedural-modeling card
    and one project-specific 3D/animation tech-stack section.
  - The Conversation Opportunity Radar has Build Process / Privacy tabs. Its
    public pipeline copy lives in `components/RadarProcessPanel.tsx`. Whenever
    Radar fetching, filtering, analysis, ranking, caching, scheduling, cost
    controls, or owner actions change, update that panel in the same commit;
    do not leave the public explanation describing an older flow.
  - **Live** (default): real-time agent trace. Each entry: small icon
    (checkmark = done, spinner = in progress, empty box = pending), agent
    name, a model badge (e.g. "Gemini 3.6 Flash", "Groq / Llama 3.3 70B"),
    one-line action description, and an italic one-line "Why this model:" note.
    These reason strings are **pre-written per agent role, not generated
    live** (see Agent pipeline below) — free, instant, always accurate.
  - **Build Process**: the case study of how this site was built. The copy lives in
    `PROCESS_STEPS` in `lib/site.ts` and is the single public record of which
    tool ran which phase — it has since grown past the mockup's five entries to
    seven, including the cross-model review passes. Edit it there; don't
    re-describe the process anywhere else.

  The Pixels experience emits only controlled Better Stack/Sentry lifecycle
  events (experience loaded, WebGL ready, WebGL unavailable). Color values and
  visitor data are never included.

  Entering the agent project always opens its panel on **Live**, even if the visitor
  last left it on Build Process. Below `lg` either panel is a modal drawer: focus moves
  into it, Tab is trapped inside it, Escape and the backdrop close it, and focus
  returns to the button that opened it.

## Agent pipeline (the actual working demo, not just UI)
Real multi-agent orchestration behind the chat interface. Sample flow to
implement:
1. **Planner** — Gemini 3.6 Flash — breaks the user's request into sub-tasks.
   Why this model: "Selected for strong reasoning during task planning."
2. **Researcher** (one worker per sub-task, run sequentially) — Groq / Llama
   3.3 70B — gathers/summarizes information relevant to the sub-tasks. Each
   result is sent to the chat before the next worker starts. Why this model:
   "Selected for fast, focused research."
3. **Critic** — Gemini 3.6 Flash — reviews the draft output for gaps/errors.
   Why this model: "Selected for careful review and error checking."
4. **Writer** — Gemini 3.6 Flash — compiles the final user-facing answer.
   Why this model: "Selected for clear, high-quality final writing."

**Model note (changed during implementation):** this spec originally said
Gemini 2.5 Flash. Google now returns 404 "no longer available to new users"
for `gemini-2.5-flash`, so a newly created AI Studio key cannot call it at
all — verified against the live API. Switched to `gemini-3.6-flash`. It is a
thinking model, so most of each call's token budget goes to reasoning rather
than visible output; the budgets in `lib/orchestrator.ts` are sized for that,
and cutting them causes silently truncated output rather than an error.

Each step emits SSE events that update the Live trace in real time (status:
pending → in-progress → done, plus the description/model/reason) and add the
completed agent's output to the chat before the next agent starts. No topic
restriction on user input — genuinely open text, like talking to Claude — just
a basic content-filter check server-side before running the pipeline (block
clearly abusive input, nothing more restrictive).

API keys needed as env vars: `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`
per the AI SDK's expected var name) and `GROQ_API_KEY`. Get both from
Google AI Studio and console.groq.com (free tier, no card needed). Put
placeholders in `.env.example`, real keys go in `.env.local` (gitignored)
and later in Railway's environment variable settings — never commit real keys.

## Validation (run all of these before every push)
```
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```
`npm test` is Vitest (`vitest.config.ts`, specs in `tests/`). Node is the
default environment; component and hook specs opt into jsdom with a
`@vitest-environment jsdom` docblock. **Provider calls are always mocked** —
`ai` and `@/lib/models` are replaced in tests, and nothing may reach the real
Gemini or Groq APIs. Every behavioural change needs a test.

`.github/workflows/ci.yml` runs the same four commands plus `npm audit` on
pushes and PRs. It runs *after* the push, and Railway deploys from `main` on its
own, so the local run is still the real gate.

## Review step (required before every push)
Before pushing to GitHub, do a self-review pass as a distinct step — re-read
the diff with fresh eyes for: broken layout vs the mockup, accessibility
(contrast, focus states, alt text), obvious bugs, secrets accidentally
committed, and whether the SSE streaming actually degrades gracefully if a
model call fails. Fix what you find, then push. Mention in the commit
message or a short summary that this review pass happened — it's part of
what the "Build Process" tab on the live site describes.

## Git / GitHub
Repo does not exist yet. Target: `https://github.com/alimajed-dev` (user's
account). Suggested repo name: `portfolio`. Steps:
1. `git init` in this directory if not already a repo.
2. Create `.gitignore` (node_modules, .next, .env.local, etc.).
3. Create the GitHub repo — use `gh repo create alimajed-dev/portfolio
   --public --source=. --remote=origin` if the `gh` CLI is authenticated
   locally (check with `gh auth status`; if not authenticated, ask the user
   to run `gh auth login` once, or create the repo manually on github.com
   and add it as a remote).
4. Commit with a clear message, push to `main`.

## Deployment — Railway
User is creating a Railway account. Once available:
1. `railway login` (opens browser auth) or connect the GitHub repo directly
   from the Railway dashboard (Railway → New Project → Deploy from GitHub
   repo → select `alimajed-dev/portfolio`) — the dashboard route is simplest
   and gives auto-deploy on every push to `main`.
2. Set env vars in Railway's project settings: `GEMINI_API_KEY`, `GROQ_API_KEY`.
3. Railway auto-detects Next.js; confirm start command is `next start` (not
   an edge/serverless build).
4. Once deployed, note the generated `*.up.railway.app` URL — needed for
   the domain step below.

## Domain — majedali.com (bought on Namecheap)
Cannot be automated without the user's Namecheap login — walk them through
it (or do it live with them via screen share if using Claude in Chrome with
their session):
1. In Railway: project → Settings → Networking → Custom Domain → add
   `majedali.com` (and `www.majedali.com` if wanted). Railway will show the
   exact DNS record(s) to add (typically a CNAME for `www` pointing to the
   Railway-provided target, and either an A record or ALIAS/ANAME for the
   root domain — Railway's UI gives the precise values, use those exactly,
   don't guess).
2. In Namecheap: Domain List → majedali.com → Manage → Advanced DNS → add
   the record(s) Railway specified.
3. DNS propagation can take up to ~24h but is often much faster.

## Avatar image
User will supply a real photo to replace the "AM" initials avatar in the
top-left of the sidebar. Build the avatar as a component that accepts an
image path and falls back to initials if none is provided, so dropping the
photo into `/public/avatar.jpg` (or updating a config value) is a one-line
change later.
