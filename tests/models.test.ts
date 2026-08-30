import { beforeEach, describe, expect, it, vi } from "vitest";

const providers = vi.hoisted(() => ({
  createGoogle: vi.fn(),
  createGroq: vi.fn(),
  google: vi.fn(() => "google-model"),
  groq: vi.fn(() => "groq-model"),
}));

vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: providers.createGoogle }));
vi.mock("@ai-sdk/groq", () => ({ createGroq: providers.createGroq }));

beforeEach(() => {
  vi.resetModules();
  providers.google.mockClear();
  providers.groq.mockClear();
  providers.createGoogle.mockReset().mockReturnValue(providers.google);
  providers.createGroq.mockReset().mockReturnValue(providers.groq);
});

describe("model configuration", () => {
  it("uses Groq's supported GPT-OSS replacement instead of retired Llama 3.3", async () => {
    const { GROQ_MODEL_ID } = await import("@/lib/models");

    expect(GROQ_MODEL_ID).toBe("openai/gpt-oss-120b");
    expect(providers.groq).toHaveBeenCalledWith(GROQ_MODEL_ID);
    expect(providers.groq).not.toHaveBeenCalledWith("llama-3.3-70b-versatile");
  });
});
