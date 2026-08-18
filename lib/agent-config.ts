function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export const agentRunTimeoutMs = () => boundedInteger(process.env.AGENT_RUN_TIMEOUT_MS, 180_000, 100, 180_000);
export const agentCallTimeoutMs = () => boundedInteger(process.env.AGENT_CALL_TIMEOUT_MS, 60_000, 1_000, 60_000);
export const agentMaxResearchers = () => boundedInteger(process.env.AGENT_MAX_RESEARCHERS, 3, 1, 3);
export const agentMaxInputLength = () => boundedInteger(process.env.AGENT_MAX_INPUT_LENGTH, 2_000, 100, 4_000);

export const agentRunsPerDay = () => boundedInteger(process.env.AGENT_RUNS_PER_DAY, 5, 1, 10);
export const agentGlobalRunsPerDay = () => boundedInteger(process.env.AGENT_GLOBAL_RUNS_PER_DAY, 200, 1, 200);
export const agentConcurrentPerIp = () => boundedInteger(process.env.AGENT_MAX_CONCURRENT_PER_IP, 1, 1, 2);
export const agentGlobalConcurrent = () => boundedInteger(process.env.AGENT_MAX_CONCURRENT_GLOBAL, 6, 1, 10);
export const trustedProxyHops = () => boundedInteger(process.env.TRUSTED_PROXY_HOPS, 1, 1, 3);

export const plannerOutputTokens = () => boundedInteger(process.env.AGENT_PLANNER_OUTPUT_TOKENS, 1_500, 500, 2_000);
export const researcherOutputTokens = () => boundedInteger(process.env.AGENT_RESEARCHER_OUTPUT_TOKENS, 500, 200, 1_000);
export const criticOutputTokens = () => boundedInteger(process.env.AGENT_CRITIC_OUTPUT_TOKENS, 1_500, 500, 2_000);
export const writerOutputTokens = () => boundedInteger(process.env.AGENT_WRITER_OUTPUT_TOKENS, 4_000, 1_000, 4_000);
