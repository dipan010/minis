import type { Platform, Sentiment, SocialPost, TimeRange } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const POSTS_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      minItems: 20,
      maxItems: 30,
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["twitter", "reddit", "news"] },
          author: { type: "string" },
          content: { type: "string" },
          hours_ago: { type: "number", minimum: 0 },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
          sentiment_score: { type: "number", minimum: -1, maximum: 1 },
          likes: { type: "integer", minimum: 0 },
          shares: { type: "integer", minimum: 0 },
          comments: { type: "integer", minimum: 0 },
          topics: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
        },
        required: [
          "platform",
          "author",
          "content",
          "hours_ago",
          "sentiment",
          "sentiment_score",
          "likes",
          "shares",
          "comments",
          "topics",
        ],
      },
    },
  },
  required: ["posts"],
};

interface RawPost {
  platform: Platform;
  author: string;
  content: string;
  hours_ago: number;
  sentiment: Sentiment;
  sentiment_score: number;
  likes: number;
  shares: number;
  comments: number;
  topics: string[];
}

const RANGE_HOURS: Record<TimeRange, number> = { "24h": 24, "7d": 168, "30d": 720 };

/** Generate 20-30 realistic but entirely fictional social media posts about
 * the keyword via Ollama. */
export async function simulateSocialData(
  keyword: string,
  timeRange: TimeRange,
  platform: "all" | Platform = "all",
  options?: OllamaCallOptions
): Promise<SocialPost[]> {
  const maxHours = RANGE_HOURS[timeRange];
  const platformInstruction =
    platform === "all"
      ? "Mix platforms: roughly half twitter, a third reddit, the rest news."
      : `ALL posts must be on platform "${platform}".`;

  const prompt = `You are a social media feed simulator for a social listening tool. Generate 20-30 ENTIRELY FICTIONAL social media posts about "${keyword}".

REQUIREMENTS:
- Sentiment distribution: roughly 40% positive, 25% negative, 35% neutral. sentiment_score must match the label (positive: 0.2 to 1, negative: -1 to -0.2, neutral: -0.2 to 0.2).
- ${platformInstruction}
- Platform-appropriate style: twitter posts are short (under 280 chars, casual, may use hashtags); reddit posts are longer and conversational (2-4 sentences, no hashtags); news entries are formal headlines with a one-sentence subhead.
- author: realistic fictional handles for twitter (@-style), reddit usernames (u/-style), or outlet names for news. Never use real people's names.
- hours_ago: spread realistically across the last ${maxHours} hours (float, 0 to ${maxHours}), with some clustering to create trend variation.
- engagement: plausible for the platform and how provocative the post is (twitter likes 0-5000, reddit upvotes as likes 0-2000, news shares 0-800). Viral posts should be rare.
- topics: 1-3 short lowercase topic phrases per post (e.g. "battery life", "pricing", "customer support"). Reuse the same phrasing for the same topic across posts so they cluster.
- Content must be plausible for "${keyword}" but must NOT restate real events or quote real people.`;

  const result = await callOllamaStructured<{ posts: RawPost[] }>(prompt, POSTS_SCHEMA, {
    temperature: 0.8,
    timeoutMs: 180_000,
    ...options,
  });

  const now = Date.now();
  return result.posts.map((p, i) => ({
    id: `post-${i + 1}`,
    platform: p.platform,
    author: p.author,
    content: p.content,
    timestamp: new Date(now - Math.min(p.hours_ago, maxHours) * 3600_000).toISOString(),
    sentiment: p.sentiment,
    sentiment_score: Math.max(-1, Math.min(1, p.sentiment_score)),
    engagement: {
      likes: Math.max(0, Math.round(p.likes)),
      shares: Math.max(0, Math.round(p.shares)),
      comments: Math.max(0, Math.round(p.comments)),
    },
    topics: p.topics.map((t) => t.toLowerCase().trim()).filter(Boolean),
  }));
}
