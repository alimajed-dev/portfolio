import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * The AI SDK's Google provider looks for GOOGLE_GENERATIVE_AI_API_KEY; the docs
 * for Google AI Studio call the same key GEMINI_API_KEY. Accept either.
 */
const googleApiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
const groqApiKey = process.env.GROQ_API_KEY ?? "";

export function missingKeys(): string[] {
  const missing: string[] = [];
  if (!googleApiKey) missing.push("GEMINI_API_KEY");
  if (!groqApiKey) missing.push("GROQ_API_KEY");
  return missing;
}

const google = createGoogleGenerativeAI({ apiKey: googleApiKey });
const groq = createGroq({ apiKey: groqApiKey });

/**
 * Reasoning-heavy steps: planning, critique, final write-up.
 * Not 2.5 Flash: Google returns 404 "no longer available to new users" for it,
 * so a fresh AI Studio key can't call it at all. Keep MODEL_LABELS in sync —
 * the badge text in the Live panel is the model that actually ran.
 */
export const geminiModel: LanguageModel = google("gemini-3.6-flash");

/**
 * Groq retired Llama 3.3 70B for developer-tier users on 2026-08-16 and
 * recommends GPT-OSS 120B as its production replacement.
 */
export const GROQ_MODEL_ID = "openai/gpt-oss-120b";

/** Fast, focused research steps whose outputs are shown one at a time. */
export const groqModel: LanguageModel = groq(GROQ_MODEL_ID);
