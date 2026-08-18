/**
 * Deliberately minimal input check. There is no topic restriction — visitors can
 * ask anything, like they would in any chat app. This only blocks input that is
 * clearly abusive, so the public demo can't be trivially used to generate it.
 */

import { agentMaxInputLength } from "./agent-config";

export const MAX_INPUT_LENGTH = agentMaxInputLength();

/** Collapse common obfuscations (l33tspeak, spacing, repeats) before matching. */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457$@!|]/g, (c) =>
      ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", $: "s", "@": "a", "!": "i", "|": "i" })[c] ?? c,
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCKED_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Sexual content involving minors.
  {
    pattern:
      /\b(child|children|kid|kids|minor|minors|underage|preteen|toddler|infant)\b[^.]{0,40}\b(sex|sexual|porn|nude|naked|erotic|fetish|molest)\b/,
    label: "sexual content involving minors",
  },
  {
    pattern: /\b(cp|csam|loli|shota)\b/,
    label: "sexual content involving minors",
  },
  // Credible instructions for mass-casualty harm.
  {
    pattern:
      /\b(how (to|do i)|instructions? for|steps? to|guide to|recipe for)\b[^.]{0,60}\b(make|build|synthesi[sz]e|manufacture|construct)\b[^.]{0,40}\b(bomb|explosive|ied|nerve agent|sarin|ricin|anthrax|bioweapon|dirty bomb|meth|napalm)\b/,
    label: "instructions for weapons or mass harm",
  },
  // Direct threats and incitement to violence.
  {
    pattern:
      /\b(how (to|do i)|help me|best way to|i want to|plan(ning)? to)\b[^.]{0,40}\b(kill|murder|assassinate|stab|shoot|poison|torture)\b[^.]{0,30}\b(him|her|them|someone|somebody|my|a person|people)\b/,
    label: "threats of violence",
  },
  // Targeted harassment / hate. Kept narrow on purpose.
  {
    pattern:
      /\b(write|generate|draft|compose|give me)\b[^.]{0,40}\b(racist|antisemitic|homophobic|transphobic|hateful|hate speech|slurs?)\b/,
    label: "hate speech",
  },
];

export type FilterResult = { ok: true } | { ok: false; message: string };

export function checkInput(raw: unknown): FilterResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Send a text message to run the agents." };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Type something for the agents to work on." };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      message: `That's a bit long for the demo — keep it under ${MAX_INPUT_LENGTH} characters.`,
    };
  }

  const normalized = normalize(trimmed);
  for (const { pattern } of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        ok: false,
        message:
          "That request is outside what this public demo will run. Ask the agents something else — there's no topic restriction beyond clearly abusive input.",
      };
    }
  }

  return { ok: true };
}
