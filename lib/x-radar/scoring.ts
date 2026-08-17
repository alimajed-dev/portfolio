import type { EngagementMetrics, RelevanceAnalysis, ScoringSignals } from "./types";

export const OPPORTUNITY_WEIGHTS = {
  reach: 0.32, engagement: 0.28, velocity: 0.15,
  relevance: 0.12, addValue: 0.07, freshness: 0.04, audience: 0.02,
} as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function metricSignals(metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const ageHours = Math.max(0.08, (now.getTime() - new Date(createdAt).getTime()) / 3_600_000);
  const interactions = metrics.replies * 5 + metrics.quotes * 4 + metrics.reposts * 2.5 + metrics.likes;
  const impressions = metrics.impressions ?? 0;
  // Separate interaction depth from view reach so a brand-new unseen post can
  // no longer receive a recommendation from relevance and freshness alone.
  const engagement = clamp(Math.log10(1 + interactions) * 35);
  const reach = clamp(Math.log10(1 + impressions) * 25);
  const velocity = clamp(Math.log10(1 + (interactions + impressions * 0.005) / ageHours) * 30);
  const freshness = clamp(100 - ageHours * 4);
  return { engagement, reach, velocity, freshness };
}

export function opportunityScore(analysis: RelevanceAnalysis, metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const deterministic = metricSignals(metrics, createdAt, now);
  const signals: ScoringSignals = { ...analysis, ...deterministic };
  const weightedScore = clamp(
    signals.reach * OPPORTUNITY_WEIGHTS.reach + signals.engagement * OPPORTUNITY_WEIGHTS.engagement +
    signals.velocity * OPPORTUNITY_WEIGHTS.velocity + signals.relevance * OPPORTUNITY_WEIGHTS.relevance + signals.abilityToAddValue * OPPORTUNITY_WEIGHTS.addValue +
    signals.freshness * OPPORTUNITY_WEIGHTS.freshness + signals.audienceValue * OPPORTUNITY_WEIGHTS.audience,
  );
  const score = signals.relevance < 40 || signals.abilityToAddValue < 35 ? Math.min(54, weightedScore) : weightedScore;
  return { score, signals };
}

export function scoreLabel(score: number) {
  return score >= 70 ? "Check" as const : score >= 55 ? "Maybe" as const : "Skip" as const;
}
