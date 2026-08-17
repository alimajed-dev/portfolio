export type EngagementMetrics = {
  likes: number; replies: number; reposts: number; quotes: number;
  impressions?: number;
};

export type XPost = {
  id: string; text: string; createdAt: string;
  author: { id: string; name: string; username: string; description?: string; followers?: number; verified?: boolean; profileImageUrl?: string };
  metrics: EngagementMetrics;
};

export type RelevanceAnalysis = {
  relevance: number; abilityToAddValue: number; audienceValue: number;
  whyReply: string; suggestedAngle: string;
};

export type ScoringSignals = RelevanceAnalysis & {
  engagement: number; reach: number; velocity: number; freshness: number;
};

export type RankedPost = XPost & {
  opportunityScore: number; label: "Check" | "Maybe" | "Skip";
  signals: ScoringSignals; whyReply: string; suggestedAngle: string; url: string;
};

export type RadarSnapshot = {
  posts: RankedPost[]; lastRefreshedAt: string; source: "x";
  nextRefreshAt?: string;
  stats: { scanned: number; rejected: number; opportunities: number };
  warning?: string;
};
