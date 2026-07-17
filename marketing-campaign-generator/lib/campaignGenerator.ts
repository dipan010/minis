import type {
  AdCopyVariant,
  CalendarDay,
  Campaign,
  CampaignBrief,
  EmailInSequence,
  ImagePromptSpec,
  SocialPost,
} from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

function briefDigest(brief: CampaignBrief): string {
  const s = brief.segment;
  return `PRODUCT: ${brief.product_name} — ${brief.product_description}
CAMPAIGN: goal ${brief.campaign_goal}, budget ${brief.budget_tier}, duration ${brief.duration}, brand voice ${brief.brand_voice}
KEY MESSAGE: ${brief.key_message}
CTA: ${brief.cta}
SEGMENT "${s.name}":
- Demographics: ${s.demographics.age_range}, ${s.demographics.gender_split}, income ${s.demographics.income_level}, ${s.demographics.location_type}
- Interests: ${s.psychographics.interests.join(", ")} | Values: ${s.psychographics.values.join(", ")}
- Pain points: ${s.psychographics.pain_points.join(", ")}
- Media habits: ${s.psychographics.media_habits.join(", ")}
- Behavior: buys ${s.behavioral.purchase_frequency}, AOV ${s.behavioral.avg_order_value}, channels ${s.behavioral.preferred_channels.join(", ")}, loyalty ${s.behavioral.brand_loyalty}`;
}

// ─── Phase a: ad copies ──────────────────────────────────────────────────────

const ADS_SCHEMA = {
  type: "object",
  properties: {
    ad_copies: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["google", "facebook", "linkedin"] },
          headline: { type: "string" },
          body: { type: "string" },
          cta: { type: "string" },
          a_b_rationale: { type: "string" },
        },
        required: ["platform", "headline", "body", "cta", "a_b_rationale"],
      },
    },
  },
  required: ["ad_copies"],
};

export async function generateAdCopies(
  brief: CampaignBrief,
  options?: OllamaCallOptions
): Promise<AdCopyVariant[]> {
  const raw = await callOllamaStructured<{
    ad_copies: Omit<AdCopyVariant, "character_counts">[];
  }>(
    `You are a performance marketing copywriter. Create EXACTLY 6 ad variants for the campaign below: 2 for Google (Search), 2 for Facebook, 2 for LinkedIn — the two per platform must test meaningfully different angles (state the test in a_b_rationale).

CHARACTER LIMITS (hard):
- google: headline ≤ 30 chars, body ≤ 90 chars
- facebook: headline ≤ 40 chars, body ≤ 125 chars
- linkedin: headline ≤ 70 chars, body ≤ 150 chars

Write in the "${brief.brand_voice}" brand voice, target the segment's pain points, and use or adapt the campaign CTA.

${briefDigest(brief)}`,
    ADS_SCHEMA,
    { temperature: 0.6, ...options }
  );

  return raw.ad_copies.map((ad) => ({
    ...ad,
    character_counts: { headline: ad.headline.length, body: ad.body.length },
  }));
}

// ─── Phase b: email sequence ─────────────────────────────────────────────────

const EMAILS_SCHEMA = {
  type: "object",
  properties: {
    emails: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          subject: { type: "string" },
          preview_text: { type: "string" },
          body_html: { type: "string" },
          send_day: { type: "integer", minimum: 1, maximum: 60 },
          purpose: { type: "string" },
          personalization_tokens: { type: "array", items: { type: "string" } },
        },
        required: [
          "subject",
          "preview_text",
          "body_html",
          "send_day",
          "purpose",
          "personalization_tokens",
        ],
      },
    },
  },
  required: ["emails"],
};

export async function generateEmailSequence(
  brief: CampaignBrief,
  options?: OllamaCallOptions
): Promise<EmailInSequence[]> {
  const raw = await callOllamaStructured<{ emails: EmailInSequence[] }>(
    `You are an email marketing specialist. Design a 5-email drip sequence spread across the campaign duration (${brief.duration}) for the campaign below.

REQUIREMENTS:
- Sequence arc matched to the "${brief.campaign_goal}" goal (e.g. hook → value → social proof → objection handling → final CTA).
- send_day: day number within the campaign for each email, ascending.
- subject: ≤ 55 chars, in the "${brief.brand_voice}" voice. preview_text: ≤ 90 chars.
- body_html: simple inline-styled HTML (p, h2, a, strong only; a single CTA button as a styled <a>). 80-150 words. Use personalization tokens like {{first_name}} and {{company}} where natural, and list every token used in personalization_tokens.
- purpose: one sentence on this email's job in the sequence.

${briefDigest(brief)}`,
    EMAILS_SCHEMA,
    { temperature: 0.6, timeoutMs: 180_000, ...options }
  );

  return raw.emails.sort((a, b) => a.send_day - b.send_day);
}

// ─── Phase c: social posts + image prompts ───────────────────────────────────

const SOCIAL_SCHEMA = {
  type: "object",
  properties: {
    posts: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["twitter", "instagram", "linkedin", "tiktok"] },
          copy: { type: "string" },
          hashtags: { type: "array", maxItems: 6, items: { type: "string" } },
          best_time: { type: "string" },
          content_type: { type: "string", enum: ["text", "image", "video", "carousel"] },
          image_prompt: {
            type: "object",
            properties: {
              scene_description: { type: "string" },
              style: { type: "string" },
              mood: { type: "string" },
              color_palette: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
              text_overlay: { type: "string" },
              aspect_ratio: { type: "string" },
            },
            required: ["scene_description", "style", "mood", "color_palette", "aspect_ratio"],
          },
        },
        required: ["platform", "copy", "hashtags", "best_time", "content_type"],
      },
    },
  },
  required: ["posts"],
};

interface RawSocialPost extends Omit<SocialPost, "image_prompt"> {
  image_prompt?: Omit<ImagePromptSpec, "platform">;
}

export async function generateSocialPosts(
  brief: CampaignBrief,
  options?: OllamaCallOptions
): Promise<{ posts: SocialPost[]; imagePrompts: ImagePromptSpec[] }> {
  const raw = await callOllamaStructured<{ posts: RawSocialPost[] }>(
    `You are a social media strategist. Create EXACTLY 8 posts for the campaign below, spread across twitter, instagram, linkedin, and tiktok (at least one each).

REQUIREMENTS:
- Platform-native style: twitter ≤ 260 chars punchy; instagram caption-style with line breaks welcome; linkedin professional 2-3 short paragraphs; tiktok is a video hook/concept description.
- hashtags: up to 6, platform-appropriate (fewer on twitter/linkedin, more on instagram/tiktok). No # symbol in the strings.
- best_time: day-of-week + time recommendation with a short reason (e.g. "Tuesday 12:30 — lunchtime scroll peak for professionals").
- content_type: "image"/"carousel"/"video" posts MUST include image_prompt — a text-to-image generation spec (scene_description 2-3 sentences, style, mood, color_palette of 3-5 hex codes, optional text_overlay, aspect_ratio like "1:1", "9:16", "16:9"). Pure "text" posts omit it.
- Voice: "${brief.brand_voice}". At least 5 of the 8 posts need an image_prompt.

${briefDigest(brief)}`,
    SOCIAL_SCHEMA,
    { temperature: 0.7, timeoutMs: 180_000, ...options }
  );

  const posts: SocialPost[] = raw.posts.map((p) => ({
    platform: p.platform,
    copy: p.copy,
    hashtags: p.hashtags.map((h) => h.replace(/^#/, "")),
    best_time: p.best_time,
    content_type: p.content_type,
    image_prompt: p.image_prompt?.scene_description,
  }));

  const imagePrompts: ImagePromptSpec[] = raw.posts
    .filter((p): p is RawSocialPost & { image_prompt: Omit<ImagePromptSpec, "platform"> } =>
      Boolean(p.image_prompt)
    )
    .map((p) => ({ ...p.image_prompt, platform: `${p.platform} (${p.content_type})` }));

  return { posts, imagePrompts };
}

// ─── Phase d: content calendar + predictions ─────────────────────────────────

const CALENDAR_SCHEMA = {
  type: "object",
  properties: {
    calendar: {
      type: "array",
      minItems: 10,
      maxItems: 30,
      items: {
        type: "object",
        properties: {
          day: { type: "integer", minimum: 1, maximum: 60 },
          channel: { type: "string" },
          asset_type: { type: "string" },
          description: { type: "string" },
        },
        required: ["day", "channel", "asset_type", "description"],
      },
    },
    performance_predictions: {
      type: "object",
      properties: {
        estimated_reach: { type: "string" },
        estimated_ctr: { type: "string" },
        estimated_conversion: { type: "string" },
      },
      required: ["estimated_reach", "estimated_ctr", "estimated_conversion"],
    },
  },
  required: ["calendar", "performance_predictions"],
};

export async function generateCalendar(
  brief: CampaignBrief,
  assets: { ads: number; emails: EmailInSequence[]; posts: SocialPost[] },
  options?: OllamaCallOptions
): Promise<Pick<Campaign, "content_calendar" | "performance_predictions">> {
  const raw = await callOllamaStructured<{
    calendar: CalendarDay[];
    performance_predictions: Campaign["performance_predictions"];
  }>(
    `You are a campaign planner. Map the assets below onto a day-by-day content calendar over the campaign duration (${brief.duration}), and estimate performance.

ASSETS TO SCHEDULE:
- ${assets.ads} paid ad variants (google/facebook/linkedin) — schedule launch days and one mid-campaign creative rotation.
- 5 drip emails already assigned send days: ${assets.emails.map((e) => `day ${e.send_day} "${e.subject}"`).join("; ")} — include them on those days.
- 8 organic social posts (${assets.posts.map((p) => p.platform).join(", ")}) — spread through the campaign with platform variety per week.

RULES:
- 10-30 calendar entries, day numbers ascending within the duration, "channel" is the platform/channel, "asset_type" like "paid ad", "drip email", "organic post", "creative rotation".
- description ≤ 20 words.
- performance_predictions: rough ranges appropriate for a "${brief.budget_tier}" budget ${brief.campaign_goal} campaign (e.g. reach "40k-70k impressions"), clearly ballpark figures.

${briefDigest(brief)}`,
    CALENDAR_SCHEMA,
    { temperature: 0.4, ...options }
  );

  return {
    content_calendar: raw.calendar.sort((a, b) => a.day - b.day),
    performance_predictions: raw.performance_predictions,
  };
}

// ─── Orchestration ───────────────────────────────────────────────────────────

/** Four sequential Ollama calls (ads → emails → social → calendar), kept
 * separate to stay within the local model's context limits. Reports phase
 * transitions through onPhase. */
export async function generateCampaign(
  brief: CampaignBrief,
  options?: OllamaCallOptions,
  onPhase?: (phase: "ads" | "emails" | "social" | "calendar") => void
): Promise<Campaign> {
  onPhase?.("ads");
  const ad_copies = await generateAdCopies(brief, options);

  onPhase?.("emails");
  const email_sequence = await generateEmailSequence(brief, options);

  onPhase?.("social");
  const { posts: social_posts, imagePrompts: image_prompts } = await generateSocialPosts(
    brief,
    options
  );

  onPhase?.("calendar");
  const { content_calendar, performance_predictions } = await generateCalendar(
    brief,
    { ads: ad_copies.length, emails: email_sequence, posts: social_posts },
    options
  );

  return {
    brief,
    ad_copies,
    email_sequence,
    social_posts,
    image_prompts,
    content_calendar,
    performance_predictions,
    total_assets:
      ad_copies.length + email_sequence.length + social_posts.length + image_prompts.length,
  };
}
