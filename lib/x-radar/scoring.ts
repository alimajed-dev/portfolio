import type { EngagementMetrics, RelevanceAnalysis, ScoringSignals } from "./types";

export const OPPORTUNITY_WEIGHTS = {
  relevance: 0.27, addValue: 0.22, engagement: 0.18,
  velocity: 0.13, freshness: 0.12, audience: 0.08,
} as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function metricSignals(metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const ageHours = Math.max(0.08, (now.getTime() - new Date(createdAt).getTime()) / 3_600_000);
  const weighted = metrics.replies * 5 + metrics.quotes * 4 + metrics.reposts * 2.5 + metrics.likes + (metrics.impressions ?? 0) * 0.015;
  // Log scaling keeps giant accounts from overwhelming smaller, high-quality discussions.
  const engagement = clamp(Math.log10(1 + weighted) * 30);
  const velocity = clamp(Math.log10(1 + weighted / ageHours) * 35);
  const freshness = clamp(100 - ageHours * 4);
  return { engagement, velocity, freshness };
}

export function opportunityScore(analysis: RelevanceAnalysis, metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const deterministic = metricSignals(metrics, createdAt, now);
  const signals: ScoringSignals = { ...analysis, ...deterministic };
  const score = clamp(
    signals.relevance * OPPORTUNITY_WEIGHTS.relevance + signals.abilityToAddValue * OPPORTUNITY_WEIGHTS.addValue +
    signals.engagement * OPPORTUNITY_WEIGHTS.engagement + signals.velocity * OPPORTUNITY_WEIGHTS.velocity +
    signals.freshness * OPPORTUNITY_WEIGHTS.freshness + signals.audienceValue * OPPORTUNITY_WEIGHTS.audience,
  );
  return { score, signals };
}

export function scoreLabel(score: number) {
  return score >= 85 ? "Excellent" as const : score >= 70 ? "Strong" as const : score >= 55 ? "Good" as const : "Weak" as const;
}
