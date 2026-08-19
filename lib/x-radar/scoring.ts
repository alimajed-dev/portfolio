import type { EngagementMetrics, RelevanceAnalysis, ScoringSignals } from "./types";

export const OPPORTUNITY_WEIGHTS = {
  personalFit: 0.22, conversationOpening: 0.22, momentum: 0.22,
  replyDensity: 0.14, brevity: 0.12, reach: 0.08,
} as const;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function metricSignals(metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const ageHours = Math.max(0.08, (now.getTime() - new Date(createdAt).getTime()) / 3_600_000);
  const impressions = metrics.impressions ?? 0;
  const repliesPerHour = metrics.replies / ageHours;
  const fallbackDenominator = Math.max(1, metrics.likes + metrics.reposts + metrics.quotes);
  const repliesPerThousandViews = impressions > 0 ? metrics.replies / impressions * 1_000 : metrics.replies / fallbackDenominator * 100;
  const momentum = clamp(15 + Math.log10(1 + metrics.replies) * 25 + Math.log10(1 + repliesPerHour) * 45);
  const replyDensity = clamp(30 + Math.log10(1 + repliesPerThousandViews) * 45);
  const reach = clamp(Math.log10(1 + impressions) * 20);
  return { momentum, replyDensity, reach };
}

export function opportunityScore(analysis: RelevanceAnalysis, metrics: EngagementMetrics, createdAt: string, now = new Date()) {
  const deterministic = metricSignals(metrics, createdAt, now);
  const signals: ScoringSignals = { ...analysis, ...deterministic };
  const weightedScore = clamp(
    signals.personalFit * OPPORTUNITY_WEIGHTS.personalFit + signals.conversationOpening * OPPORTUNITY_WEIGHTS.conversationOpening +
    signals.momentum * OPPORTUNITY_WEIGHTS.momentum + signals.replyDensity * OPPORTUNITY_WEIGHTS.replyDensity +
    signals.brevity * OPPORTUNITY_WEIGHTS.brevity + signals.reach * OPPORTUNITY_WEIGHTS.reach,
  );
  const score = signals.personalFit < 50 || signals.conversationOpening < 50 || metrics.replies < 3 ? Math.min(54, weightedScore) : weightedScore;
  return { score, signals };
}

export function scoreLabel(score: number) {
  return score >= 70 ? "Check" as const : score >= 55 ? "Maybe" as const : "Skip" as const;
}
