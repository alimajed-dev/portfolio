import type { EngagementMetrics, RelevanceAnalysis, ScoringSignals } from "./types";

export const OPPORTUNITY_WEIGHTS = {
  engagement: 0.32, velocity: 0.28, relevance: 0.15,
  audience: 0.10, reach: 0.08, addValue: 0.07,
} as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function metricSignals(metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const ageHours = Math.max(0.08, (now.getTime() - new Date(createdAt).getTime()) / 3_600_000);
  const interactions = metrics.replies * 5 + metrics.quotes * 4 + metrics.reposts * 2.5 + (metrics.bookmarks ?? 0) * 2 + metrics.likes;
  const impressions = metrics.impressions ?? 0;
  // Interaction depth and interaction velocity are independent of raw views.
  // Age is used only to measure the rate at which real interactions arrive.
  const engagement = clamp(Math.log10(1 + interactions) * 35);
  const reach = clamp(Math.log10(1 + impressions) * 25);
  const velocity = clamp(Math.log10(1 + interactions / ageHours) * 30);
  return { engagement, reach, velocity };
}

export function opportunityScore(analysis: RelevanceAnalysis, metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const deterministic = metricSignals(metrics, createdAt, now);
  const signals: ScoringSignals = { ...analysis, ...deterministic };
  const weightedScore = clamp(
    signals.engagement * OPPORTUNITY_WEIGHTS.engagement + signals.velocity * OPPORTUNITY_WEIGHTS.velocity +
    signals.relevance * OPPORTUNITY_WEIGHTS.relevance + signals.audienceValue * OPPORTUNITY_WEIGHTS.audience +
    signals.reach * OPPORTUNITY_WEIGHTS.reach + signals.abilityToAddValue * OPPORTUNITY_WEIGHTS.addValue,
  );
  const score = signals.relevance < 40 || signals.abilityToAddValue < 35 ? Math.min(54, weightedScore) : weightedScore;
  return { score, signals };
}

export function scoreLabel(score: number) {
  return score >= 70 ? "Check" as const : score >= 55 ? "Maybe" as const : "Skip" as const;
}
