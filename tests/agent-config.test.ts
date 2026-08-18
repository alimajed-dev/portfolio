import { afterEach, describe, expect, it, vi } from "vitest";
import { agentCallTimeoutMs, agentConcurrentPerIp, agentGlobalConcurrent, agentGlobalRunsPerDay, agentMaxInputLength, agentMaxResearchers, agentRunTimeoutMs, agentRunsPerDay, criticOutputTokens, plannerOutputTokens, researcherOutputTokens, trustedProxyHops, writerOutputTokens } from "@/lib/agent-config";

const keys = [
  "AGENT_RUN_TIMEOUT_MS",
  "AGENT_CALL_TIMEOUT_MS",
  "AGENT_MAX_RESEARCHERS",
  "AGENT_MAX_INPUT_LENGTH",
  "AGENT_RUNS_PER_DAY",
  "AGENT_GLOBAL_RUNS_PER_DAY",
  "AGENT_MAX_CONCURRENT_PER_IP",
  "AGENT_MAX_CONCURRENT_GLOBAL",
  "TRUSTED_PROXY_HOPS",
  "AGENT_PLANNER_OUTPUT_TOKENS",
  "AGENT_RESEARCHER_OUTPUT_TOKENS",
  "AGENT_CRITIC_OUTPUT_TOKENS",
  "AGENT_WRITER_OUTPUT_TOKENS",
] as const;

afterEach(() => vi.unstubAllEnvs());

const values = () => [agentRunTimeoutMs(), agentCallTimeoutMs(), agentMaxResearchers(), agentMaxInputLength(), agentRunsPerDay(), agentGlobalRunsPerDay(), agentConcurrentPerIp(), agentGlobalConcurrent(), trustedProxyHops(), plannerOutputTokens(), researcherOutputTokens(), criticOutputTokens(), writerOutputTokens()];

describe("Agent orchestration numeric configuration", () => {
  it.each(["invalid", " "])("uses safe fallbacks for %s values", (value) => {
    for (const key of keys) vi.stubEnv(key, value);
    expect(values()).toEqual([180_000, 60_000, 3, 2_000, 5, 200, 1, 6, 1, 1_500, 500, 1_500, 4_000]);
  });

  it("clamps oversized values to hard bounds", () => {
    for (const key of keys) vi.stubEnv(key, "9999999");
    expect(values()).toEqual([180_000, 60_000, 3, 4_000, 10, 200, 2, 10, 3, 2_000, 1_000, 2_000, 4_000]);
  });
});
