# Ali Majed — Portfolio

Personal portfolio site. It doubles as its own proof of work: a real multi-agent
orchestration demo you can talk to, plus a case study of how the site itself was
built end to end with Claude tools.

Live: [majedali.com](https://majedali.com)

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) running as a persistent Node server |
| Styling | Tailwind CSS v4, tokens defined in `app/globals.css` |
| Model calls | Vercel AI SDK (`ai`) with `@ai-sdk/google` and `@ai-sdk/groq` |
| Streaming | Server-Sent Events, server → browser only |
| Icons | `lucide-react` (brand marks inlined — lucide v1 dropped them) |
| Font | Archivo, self-hosted via `next/font/local` |
| Tests | Vitest + React Testing Library, all provider calls mocked |
| Hosting | Railway (single instance) |

No database, no auth, no payments. Rate limiting is an in-memory counter, which
is why this needs a long-lived process rather than serverless functions — and
why the free tier's ~60s function cap would cut off a streamed agent run.

The font is checked in rather than fetched from Google at build time: a build
that reaches the network before it compiles any app code fails behind a proxy or
during a Fonts outage, for no benefit on a one-font site.

## Running locally

```bash
nvm use                      # Node 22, per .nvmrc
npm install
cp .env.example .env.local   # then fill in the two keys
npm run dev
```

Both keys are free tier, no card required:

- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/apikey).
  The AI SDK's own name for this is `GOOGLE_GENERATIVE_AI_API_KEY`; either works.
- `GROQ_API_KEY` — [Groq Console](https://console.groq.com/keys).

Without the keys the site runs fine; the demo shows a "not configured" message
instead of an agent run.

`NEXT_PUBLIC_GA_ID` is optional. Leave it empty and no analytics script loads;
set it to a GA4 measurement ID (`G-XXXXXXXXXX`) and Google Analytics is enabled.
Keep it unset locally so development traffic stays out of the reports. Because
the whole site is one route, pane changes are reported as virtual page views
(`/`, `/contact`, `/projects/<id>`) — see `lib/analytics.ts`.

A note on the Gemini model: the spec called for Gemini 2.5 Flash, but Google now
returns 404 "no longer available to new users" for it, so a freshly created AI
Studio key cannot call it. The pipeline uses `gemini-3.6-flash` instead. It is a
thinking model, which is why the token budgets in `lib/orchestrator.ts` look
generous — most of each budget goes to reasoning tokens, not visible output, and
trimming them truncates results silently rather than erroring.

## The agent pipeline

`POST /api/agent` streams SSE events while four agents run for real:

1. **Planner** — Gemini 3.6 Flash — splits the request into up to 3 sub-tasks.
   *Selected for strong reasoning during task planning.*
2. **Researchers** — Groq / Llama 3.3 70B — one focused worker per sub-task,
   run sequentially so every result is visible before the next begins.
   *Selected for fast, focused research.*
3. **Critic** — Gemini 3.6 Flash — reviews the notes for gaps before write-up.
   *Selected for careful review and error checking.*
4. **Writer** — Gemini 3.6 Flash, streamed — compiles the final answer.
   *Selected for clear, high-quality final writing.*

The one-line reasons are pre-written per role, never generated — free, instant,
and always accurate about the routing decision that was actually made.
Each completed agent also streams its contribution into the chat before the
next agent begins, followed by the writer's final answer.

Every stage degrades rather than aborting: a failed planner falls back to
researching the request as-is, failed researchers drop out of the notes, a
failed critic is skipped, and a failed writer retries on Groq (unless it already
streamed text, in which case the answer is truncated with a visible note).

Each model call is capped at 60 seconds and the whole run at 180 seconds
(`AGENT_RUN_TIMEOUT_MS`). A run that hits the ceiling stops, says so, and keeps
whatever text had already streamed rather than replacing it with an error.

Input is open — no topic restriction. `lib/content-filter.ts` blocks only
clearly abusive requests. `lib/rate-limit.ts` caps each visitor at 5 runs per
day with one concurrent run, and all visitors together at 200 runs per day with
6 concurrent. The per-visitor key is the *rightmost* `X-Forwarded-For` entry —
the hop Railway's proxy appends, and the only one a caller can't forge — so the
global ceilings are what bound spend if someone rotates addresses anyway. Both
counters live in process memory, so **the service must run as a single
instance**; more replicas multiply every cap.

## Validation

```bash
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```

`.github/workflows/ci.yml` runs the same set plus `npm audit` on every push and
pull request. Tests never call Gemini or Groq: `ai` and `lib/models.ts` are
mocked, so a run is deterministic and free.

## Layout

Single client-side app, three panes, no page reloads:

- **Left** — collapsible sidebar (264px / 72px): Contact, then one nav item per
  project. Collapsed by default under 1024px.
- **Middle** — bio and skills by default, contact links, or the project chat.
- **Right** (360px, projects only) — Live agent trace, or the Step by step case
  study. Becomes an overlay drawer under 1024px.

## Where things live

```
app/api/agent/route.ts   SSE endpoint: filter → rate limit → run budget → pipeline
lib/orchestrator.ts      the four-agent pipeline and its failure handling
lib/pipeline-plan.ts     model labels, pre-written reasons, idle trace shape
lib/models.ts            provider setup and env-var checks
lib/rate-limit.ts        per-IP and global run caps, trusted-proxy IP extraction
lib/agent-transport.ts   client-side SSE parsing and response validation
lib/site.ts              all site copy, links, projects, case study
components/              AppShell, Sidebar, RightPanel, panes
tests/                   Vitest specs — providers mocked, never called
docs/                    requirements, design brief, approved mockup
```

Adding a project is an entry in `PROJECTS` in `lib/site.ts`. Swapping the avatar
is a file in `public/` and one line in `OWNER.avatarSrc` — it falls back to
initials on its own if the file is missing.

## Deployment

Railway builds with `next build` and serves with `next start`, binding the
`PORT` it injects. It reads the Node major from `.nvmrc`, so local, CI and
production agree. Set `GEMINI_API_KEY` and `GROQ_API_KEY` in the project's
variables. Pushes to `main` auto-deploy, so treat CI as reporting rather than
gating and run the validation set before pushing.

Keep the service at **one instance**: the rate limiter's counters are per
process.

`next.config.ts` sets baseline security headers (`nosniff`, `Referrer-Policy`,
frame denial, `Permissions-Policy`, HSTS) on every route. A full `script-src`
CSP is deliberately not there yet — Next and Google Analytics both inject inline
scripts, so a real policy needs nonces and a smoke test to prove the page still
boots.
