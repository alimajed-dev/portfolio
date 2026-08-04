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
| Font | Archivo via `next/font/google` |
| Hosting | Railway |

No database, no auth, no payments. Rate limiting is an in-memory per-IP counter,
which is why this needs a long-lived process rather than serverless functions —
and why the free tier's ~60s function cap would cut off a streamed agent run.

## Running locally

```bash
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

## The agent pipeline

`POST /api/agent` streams SSE events while four agents run for real:

1. **Planner** — Gemini 2.5 Flash — splits the request into up to 3 sub-tasks.
   *Needs reasoning, not speed.*
2. **Researchers** — Groq / Llama 3.3 70B — one worker per sub-task, in parallel.
   *Fast, parallel-friendly.*
3. **Critic** — Gemini 2.5 Flash — reviews the notes for gaps before write-up.
   *Quality check.*
4. **Writer** — Gemini 2.5 Flash, streamed — compiles the final answer.
   *User-facing quality.*

The one-line reasons are pre-written per role, never generated — free, instant,
and always accurate about the routing decision that was actually made.

Every stage degrades rather than aborting: a failed planner falls back to
researching the request as-is, failed researchers drop out of the notes, a
failed critic is skipped, and a failed writer retries on Groq (unless it already
streamed text, in which case the answer is truncated with a visible note).

Input is open — no topic restriction. `lib/content-filter.ts` blocks only
clearly abusive requests, and `lib/rate-limit.ts` caps each visitor at 5 runs
per day with one concurrent run.

## Layout

Single client-side app, three panes, no page reloads:

- **Left** — collapsible sidebar (264px / 72px): Contact, then one nav item per
  project. Collapsed by default under 1024px.
- **Middle** — bio and skills by default, contact links, or the project chat.
- **Right** (360px, projects only) — Live agent trace, or the Process case
  study. Becomes an overlay drawer under 1024px.

## Where things live

```
app/api/agent/route.ts   SSE endpoint: filter → rate limit → pipeline
lib/orchestrator.ts      the four-agent pipeline and its failure handling
lib/pipeline-plan.ts     model labels, pre-written reasons, idle trace shape
lib/models.ts            provider setup and env-var checks
lib/site.ts              all site copy, links, projects, case study
components/              AppShell, Sidebar, RightPanel, panes
docs/                    requirements, design brief, approved mockup
```

Adding a project is an entry in `PROJECTS` in `lib/site.ts`. Swapping the avatar
is a file in `public/` and one line in `OWNER.avatarSrc` — it falls back to
initials on its own if the file is missing.

## Deployment

Railway builds with `next build` and serves with `next start`, binding the
`PORT` it injects. Set `GEMINI_API_KEY` and `GROQ_API_KEY` in the project's
variables. Pushes to `main` auto-deploy.
