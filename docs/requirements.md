# Portfolio Site — Business Requirements

## Goal
A personal portfolio proving two skills: agentic AI/orchestration, and full-lifecycle web development. Primary CTA: get in touch.

## Audience
Both technical and non-technical people evaluating for freelance/contract work. Must skim well in 30 seconds, reward deeper digging.

## Site Structure
- Modern chat-app layout (Claude-style): collapsible left sidebar nav, main content area on the right.
- Sidebar items: **Contact** (one entry) + **Projects/Apps** (one entry per project, extensible over time). First project entry = this multi-agent demo.
- Visual style: light mode, clean chat-app aesthetic (Claude/ChatGPT-style) — warm off-white background, soft muted accent colors, understated, nothing flashy or heavily saturated.

## Default View
When nothing is selected, main area shows short bio + the two core skills (agentic AI/orchestration, full-lifecycle web dev).

## Contact
Sidebar entry opens contact info/CTA in the main area.

## Layout (3-pane, Claude-style)
- **Left:** sidebar nav — Contact + Projects/Apps.
- **Middle:** the running app (e.g. the chat input/output for the flagship demo, or the contact page).
- **Right:** contextual panel, only shown for project entries, with a toggle at the top (same pattern as Claude's preview/code toggle):
  - **Live** (default while demo runs): real-time agent trace — each agent's current action + which model is handling it and why.
  - **Process**: the curated **"See the process"** case study — Requirements → Design → Implementation → Review → Deployment, naming the actual tool used at each phase.
- Right panel is empty/hidden when Contact is selected.

## Project 1 (Flagship Demo)
- Open text input: visitor asks anything.
- Live view shows each agent's current action in real time.
- Each agent's action is paired with a plain-language note on which model is handling it and why (pre-written per role, not generated live — free, instant, accurate).
- Model routing:
  - Planner, Critic, Writer agents → Gemini 2.5 Flash (reasoning-heavy steps)
  - Research/Worker agents → Groq (Llama 3.3 70B) (speed-visible steps)
  - Both free tier.
- Abuse/cost control: hard per-visitor run cap. Basic content filter only, no topic restriction.

## Build & Ops
- Code pushed to GitHub after an automated review-agent pass.
- Deployed on Railway (avoids serverless timeout risk during long streamed agent runs).
- Claude handles requirements, design, build, review, and deployment end to end; user reviews at checkpoints.

## Out of Scope (v1)
- User accounts / auth
- Payment or booking flows
- Multi-language support
