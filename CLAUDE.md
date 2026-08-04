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
- Implementation: **your job, starting now**
- Review: automated review pass required before pushing (see "Review" below)
- Deployment: Railway (user is creating the account)

## Tech stack (already decided, do not deviate without asking)
- **Framework:** Next.js (React, TypeScript). Runs as a normal persistent
  Node server — NOT deployed on Vercel, specifically because Vercel's free
  tier caps function execution around 60s and would cut off long streamed
  agent runs mid-demo. Railway runs it as a long-lived process instead, so
  build it to run via `next build && next start`, not as edge/serverless
  functions.
- **Styling:** Tailwind CSS.
- **Model calls / streaming:** Vercel AI SDK (`ai` package + `@ai-sdk/google`
  and a Groq provider) — gives a unified streaming interface across Gemini
  and Groq so the agent pipeline can stream step-by-step to the frontend
  regardless of which model is handling a given step. (This is just a
  library; using it doesn't imply Vercel hosting.)
- **Live transport:** Server-Sent Events (SSE), one-directional
  server→browser. No WebSockets needed.
- **Rate limiting:** in-memory store keyed by IP, no database. Hard cap on
  runs per visitor per day (pick something reasonable, e.g. 5) to protect
  the free model quotas (Gemini 2.5 Flash free tier, Groq free tier).
- **Icons:** Lucide (`lucide-react`) — matches the mockup exactly.
- **Font:** Archivo (Google Fonts).
- **No database, no auth, no payments** — out of scope for v1, see
  `docs/requirements.md`.

## Design reference — quick token sheet
(Extracted from the approved mockup at `docs/design/mockup.html`. Use these,
not any conflicting values in other design-system export files.)
- Background: `#f3f2f2` (main), `#eae9e9` (sidebar/surface)
- Text: `#201e1d`
- Accent (primary, buttons/active/links): `#3F5BD9`, hover `#3349B0`, active `#283C8C`
- Accent tint (badges/active nav item bg): `#EEF1FE` / text `#33449E`
- Neutral scale used for secondary text/badges: `#7d7979`, `#605d5d`, `#9b9797`, `#bab6b6`, `#f8f4f4`, `#444141`
- Borders/dividers: `rgba(32,30,29,0.08–0.14)`
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
  v1 has exactly one: "Agent Orchestration Demo".
- **Middle pane:** changes based on sidebar selection.
  - Nothing selected / default: bio + two skill cards (Agentic AI /
    Web Development, copy already in the mockup) + "Get in touch" CTA button.
  - Contact selected: "Let's build something." heading + short line + email
    CTA button + link rows for email, LinkedIn (linkedin.com/in/ali-majed),
    X (x.com/AliMajed93), YouTube (youtube.com/@alimajed93), GitHub
    (github.com/alimajed-dev). Direct links only, no contact form.
  - Project selected: chat-style interface — message bubbles, input box at
    bottom, "Message the agent…" placeholder.
- **Right panel** (360px, only visible when a project is selected): Live /
  Process toggle at top.
  - **Live** (default): real-time agent trace. Each entry: small icon
    (checkmark = done, spinner = in progress, empty box = pending), agent
    name, a model badge (e.g. "Gemini 2.5 Flash", "Groq / Llama 3.3 70B"),
    one-line action description, and an italic one-line "Reason:" note.
    These reason strings are **pre-written per agent role, not generated
    live** (see Agent pipeline below) — free, instant, always accurate.
  - **Process**: the case study. Five entries: Requirements (Claude —
    conversation), Design (Claude Design), Implementation (Claude Code),
    Review (automated review agent), Deployment (GitHub → Railway). Each
    with a one-line description (already drafted in the mockup, reuse
    verbatim or refine).

## Agent pipeline (the actual working demo, not just UI)
Real multi-agent orchestration behind the chat interface. Sample flow to
implement:
1. **Planner** — Gemini 2.5 Flash — breaks the user's request into sub-tasks.
   Reason shown to user: "needs reasoning, not speed."
2. **Researcher** (may run as 1+ parallel workers) — Groq / Llama 3.3 70B —
   gathers/summarizes information relevant to the sub-tasks. Reason:
   "fast, parallel-friendly."
3. **Critic** — Gemini 2.5 Flash — reviews the draft output for gaps/errors.
   Reason: "quality check."
4. **Writer** — Gemini 2.5 Flash — compiles the final user-facing answer.
   Reason: "user-facing quality."

Each step should emit an SSE event the frontend uses to update the Live
trace panel in real time (status: pending → in-progress → done, plus the
description/model/reason for that step). No topic restriction on user
input — genuinely open text, like talking to Claude — just a basic
content-filter check server-side before running the pipeline (block clearly
abusive input, nothing more restrictive).

API keys needed as env vars: `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`
per the AI SDK's expected var name) and `GROQ_API_KEY`. Get both from
Google AI Studio and console.groq.com (free tier, no card needed). Put
placeholders in `.env.example`, real keys go in `.env.local` (gitignored)
and later in Railway's environment variable settings — never commit real keys.

## Review step (required before every push)
Before pushing to GitHub, do a self-review pass as a distinct step — re-read
the diff with fresh eyes for: broken layout vs the mockup, accessibility
(contrast, focus states, alt text), obvious bugs, secrets accidentally
committed, and whether the SSE streaming actually degrades gracefully if a
model call fails. Fix what you find, then push. Mention in the commit
message or a short summary that this review pass happened — it's part of
what the "Process" tab on the live site will describe.

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
