import type {
  SentimentBreakdown,
  SocialPost,
  TimeRange,
  TopicCluster,
  TrendPoint,
} from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

/** Pure aggregation — no LLM. */
export function analyzeSentiment(posts: SocialPost[]): SentimentBreakdown {
  const breakdown = { positive: 0, negative: 0, neutral: 0 };
  let total = 0;
  for (const post of posts) {
    breakdown[post.sentiment] += 1;
    total += post.sentiment_score;
  }
  return {
    ...breakdown,
    average_score: posts.length ? Number((total / posts.length).toFixed(3)) : 0,
  };
}

/** Pure aggregation: bucket posts into hourly (24h) or daily trend points. */
export function buildTrend(posts: SocialPost[], timeRange: TimeRange): TrendPoint[] {
  const hourly = timeRange === "24h";
  const buckets = new Map<string, TrendPoint>();

  for (const post of posts) {
    const d = new Date(post.timestamp);
    const key = hourly
      ? `${d.toISOString().slice(0, 13)}:00`
      : d.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? {
      date: key,
      positive: 0,
      negative: 0,
      neutral: 0,
      volume: 0,
    };
    bucket[post.sentiment] += 1;
    bucket.volume += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const CLUSTER_SCHEMA = {
  type: "object",
  properties: {
    clusters: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          post_ids: { type: "array", items: { type: "string" } },
        },
        required: ["topic", "post_ids"],
      },
    },
  },
  required: ["clusters"],
};

/** LLM pass: identify 5-8 topic clusters and assign posts to them, then
 * compute per-cluster stats locally. */
export async function clusterTopics(
  posts: SocialPost[],
  options?: OllamaCallOptions
): Promise<TopicCluster[]> {
  const digest = posts
    .map((p) => `${p.id} [${p.sentiment}]: ${p.content.slice(0, 160)}`)
    .join("\n");

  const result = await callOllamaStructured<{
    clusters: { topic: string; post_ids: string[] }[];
  }>(
    `You are a topic-clustering engine for social listening. Below are social posts, one per line, formatted "id [sentiment]: content". Identify 5-8 distinct discussion topics and assign each post to the clusters it belongs to (a post may appear in at most 2 clusters; every post should appear in at least one).

Topic names: short noun phrases of 1-4 words (e.g. "battery life", "pricing concerns").

POSTS:
${digest}`,
    CLUSTER_SCHEMA,
    { temperature: 0.2, timeoutMs: 150_000, ...options }
  );

  const byId = new Map(posts.map((p) => [p.id, p]));

  return result.clusters
    .map((cluster) => {
      const members = cluster.post_ids
        .map((id) => byId.get(id))
        .filter((p): p is SocialPost => Boolean(p));
      const sentiment =
        members.length > 0
          ? members.reduce((sum, p) => sum + p.sentiment_score, 0) / members.length
          : 0;
      return {
        topic: cluster.topic,
        count: members.length,
        sentiment: Number(sentiment.toFixed(3)),
        sample_posts: members.slice(0, 2).map((p) => p.content),
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    insights: { type: "array", minItems: 5, maxItems: 5, items: { type: "string" } },
  },
  required: ["insights"],
};

/** LLM pass: 5 key insights summarizing the conversation. */
export async function generateInsights(
  posts: SocialPost[],
  topics: TopicCluster[],
  keyword: string,
  options?: OllamaCallOptions
): Promise<string[]> {
  const breakdown = analyzeSentiment(posts);
  const topicSummary = topics
    .map((t) => `- "${t.topic}": ${t.count} posts, avg sentiment ${t.sentiment}`)
    .join("\n");
  const topPosts = [...posts]
    .sort(
      (a, b) =>
        b.engagement.likes + b.engagement.shares - (a.engagement.likes + a.engagement.shares)
    )
    .slice(0, 5)
    .map((p) => `- (${p.platform}, ${p.sentiment}) ${p.content.slice(0, 140)}`)
    .join("\n");

  const result = await callOllamaStructured<{ insights: string[] }>(
    `You are a social intelligence analyst. Summarize the online conversation about "${keyword}" into exactly 5 key insights for a brand/comms team. Each insight is 1-2 sentences, specific and actionable — cover sentiment drivers, notable topics, platform differences, and any emerging risk or opportunity.

DATA:
- ${posts.length} posts. Sentiment: ${breakdown.positive} positive / ${breakdown.negative} negative / ${breakdown.neutral} neutral (avg score ${breakdown.average_score}).
- Topic clusters:
${topicSummary}
- Highest-engagement posts:
${topPosts}`,
    INSIGHTS_SCHEMA,
    { temperature: 0.4, timeoutMs: 120_000, ...options }
  );

  return result.insights;
}
