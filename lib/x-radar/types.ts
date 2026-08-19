export type EngagementMetrics = {
  likes: number; replies: number; reposts: number; quotes: number;
  bookmarks?: number; impressions?: number;
};

export type PostEntity = {
  start: number; end: number; kind: "url" | "mention" | "hashtag";
  value: string; href: string;
};

export type XPost = {
  id: string; text: string; createdAt: string;
  format?: "standard" | "note" | "article";
  entities?: PostEntity[];
  quotedPost?: { text: string; authorUsername?: string };
  author: { id: string; name: string; username: string; description?: string; followers?: number; postsPerMonth?: number; verified?: boolean; profileImageUrl?: string };
  metrics: EngagementMetrics;
};

export type RelevanceAnalysis = {
  personalFit: number; conversationOpening: number; brevity: number;
  whyReply: string; suggestedAngle: string;
};

export type ScoringSignals = RelevanceAnalysis & {
  momentum: number; replyDensity: number; reach: number;
};

export type RankedPost = XPost & {
  opportunityScore: number; label: "Check" | "Maybe" | "Skip";
  signals: ScoringSignals; whyReply: string; suggestedAngle: string; url: string;
  exceptionalTrend: boolean;
};

export type RadarSnapshot = {
  posts: RankedPost[]; lastRefreshedAt: string; source: "x";
  nextRefreshAt?: string;
  stats: { scanned: number; rejected: number; opportunities: number };
  warning?: string;
};
