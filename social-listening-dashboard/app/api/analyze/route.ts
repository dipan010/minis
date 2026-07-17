import { NextRequest, NextResponse } from "next/server";
import { simulateSocialData } from "@/lib/socialSimulator";
import { analyzeSentiment, buildTrend, clusterTopics, generateInsights } from "@/lib/analysis";
import type { DashboardReport, QueryInput } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const PIPELINE_TIMEOUT_MS = 280_000;

export async function POST(request: NextRequest) {
  let body: QueryInput & { model?: string; ollamaUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const keyword = body.keyword?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "A keyword is required." }, { status: 400 });
  }

  const timeRange = body.timeRange ?? "7d";
  const platform = body.platform ?? "all";
  const options = { model: body.model, ollamaUrl: body.ollamaUrl };

  try {
    const report = await Promise.race([
      (async (): Promise<DashboardReport> => {
        const posts = await simulateSocialData(keyword, timeRange, platform, options);
        const topics = await clusterTopics(posts, options);
        const key_insights = await generateInsights(posts, topics, keyword, options);
        return {
          keyword,
          total_posts: posts.length,
          sentiment: analyzeSentiment(posts),
          posts,
          topics,
          trend: buildTrend(posts, timeRange),
          key_insights,
          generated_at: new Date().toISOString(),
        };
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Analysis pipeline timed out (3 LLM calls, ~5 min cap).")),
          PIPELINE_TIMEOUT_MS
        )
      ),
    ]);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
