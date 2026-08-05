# Agent instructions

**The project handoff is [`CLAUDE.md`](./CLAUDE.md). Read that file — it is the
single source of truth for scope, stack, design tokens, layout, the agent
pipeline, and deployment.**

This file exists because different coding agents look for different filenames.
It is a pointer, not a second copy: an earlier fork of it duplicated `CLAUDE.md`
with the tool names swapped, which left two handoffs telling different stories
about how the site was built.

For the record of which tool actually did what — including the cross-model
review passes — see `PROCESS_STEPS` in [`lib/site.ts`](./lib/site.ts). That array
is what the site's own "Process" tab renders, so it is the version the public
sees and the one to keep accurate.

## Before you push

1. `npm run lint`
2. `npx tsc --noEmit --incremental false`
3. `npm test`
4. `npm run build`

Then do a self-review pass over the diff — layout against
`docs/design/mockup.html`, accessibility, secrets, and whether the SSE stream
still degrades gracefully when a model call fails. `.github/workflows/ci.yml`
runs the same commands, but it runs them after the push; Railway deploys from
`main` on its own.

Never commit `.env.local` or real API keys.
