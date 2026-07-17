export type Platform = "twitter" | "reddit" | "news";
export type Sentiment = "positive" | "negative" | "neutral";
export type TimeRange = "24h" | "7d" | "30d";

export interface QueryInput {
  keyword: string;
  platform?: "all" | Platform;
  timeRange?: TimeRange;
}

export interface SocialPost {
  id: string;
  platform: Platform;
  author: string;
  content: string;
  timestamp: string; // ISO
  sentiment: Sentiment;
  sentiment_score: number; // -1..1
  engagement: { likes: number; shares: number; comments: number };
  topics: string[];
}

export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  average_score: number;
}

export interface TopicCluster {
  topic: string;
  count: number;
  sentiment: number; // -1..1 average
  sample_posts: string[];
}

export interface TrendPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
}

export interface DashboardReport {
  keyword: string;
  total_posts: number;
  sentiment: SentimentBreakdown;
  posts: SocialPost[];
  topics: TopicCluster[];
  trend: TrendPoint[];
  key_insights: string[];
  generated_at: string;
}

export const PLATFORM_META: Record<Platform, { label: string; icon: string }> = {
  twitter: { label: "Twitter/X", icon: "𝕏" },
  reddit: { label: "Reddit", icon: "ⓡ" },
  news: { label: "News", icon: "📰" },
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: "#22C55E",
  negative: "#EF4444",
  neutral: "#94A3B8",
};
