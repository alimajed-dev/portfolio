# Design Brief — Portfolio Site

## Purpose
Personal portfolio proving two skills: agentic AI/orchestration, and full-lifecycle web development. Audience: technical + non-technical people evaluating for freelance/contract work. Primary CTA: contact.

## Layout — 3-pane, chat-app style (like Claude/ChatGPT)
- **Left:** collapsible sidebar. Items: "Contact" (single entry) + "Projects" (list, first entry = "Agent Orchestration Demo", extensible).
- **Middle:** main content — the running app (chat-style input/output) or the contact page.
- **Right:** contextual panel, shown only for project entries, with a toggle at top:
  - **Live** (default): real-time agent trace — list of steps, each showing agent name, current action, a model badge, and a one-line reason for that model choice.
  - **Process**: curated case study with sections Requirements → Design → Implementation → Review → Deployment, naming the tool used at each phase.
  - Empty/hidden when Contact is selected.

## Visual Style
Light mode. Warm off-white background (not stark white). Clean sans-serif typography. One or two muted/soft accent colors used sparingly (buttons, active states, model badges) — nothing neon or heavily saturated. Generous whitespace, rounded corners, soft borders, minimal shadows — overall feel close to Claude's and ChatGPT's own interfaces.

## Screens to design
1. **Default/landing** (nothing selected): short bio + the two skill highlights + contact CTA in the middle pane; sidebar visible; right pane empty.
2. **Project — Live mode**: chat-style input in the middle; right pane shows the live agent trace, updating step by step.
3. **Project — Process mode**: same layout, right pane swapped to the case study, with the toggle visible.
4. **Contact view**: contact info/CTA in the middle; right pane empty.
5. **Sidebar collapsed state**: icon-only sidebar, expandable.

## Deliverable
High-fidelity mockups for the 5 states above, with consistent reusable components: sidebar item, model badge, live/process toggle, buttons.
