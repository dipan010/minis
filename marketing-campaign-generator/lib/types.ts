export interface CustomerSegment {
  name: string;
  demographics: {
    age_range: string;
    gender_split: string;
    income_level: string;
    location_type: string;
  };
  psychographics: {
    interests: string[];
    values: string[];
    pain_points: string[];
    media_habits: string[];
  };
  behavioral: {
    purchase_frequency: string;
    avg_order_value: string;
    preferred_channels: string[];
    brand_loyalty: string;
  };
}

export type CampaignGoal = "awareness" | "acquisition" | "retention" | "upsell";
export type BudgetTier = "low" | "medium" | "high";
export type BrandVoice = "professional" | "casual" | "playful" | "luxury" | "bold";

export interface CampaignBrief {
  product_name: string;
  product_description: string;
  campaign_goal: CampaignGoal;
  budget_tier: BudgetTier;
  duration: string;
  brand_voice: BrandVoice;
  key_message: string;
  cta: string;
  segment: CustomerSegment;
}

export type AdPlatform = "google" | "facebook" | "instagram" | "linkedin";

export interface AdCopyVariant {
  headline: string;
  body: string;
  cta: string;
  platform: AdPlatform;
  character_counts: { headline: number; body: number };
  a_b_rationale: string;
}

export interface EmailInSequence {
  subject: string;
  preview_text: string;
  body_html: string;
  send_day: number;
  purpose: string;
  personalization_tokens: string[];
}

export type SocialPlatform = "twitter" | "instagram" | "linkedin" | "tiktok";
export type SocialContentType = "text" | "image" | "video" | "carousel";

export interface SocialPost {
  platform: SocialPlatform;
  copy: string;
  hashtags: string[];
  best_time: string;
  content_type: SocialContentType;
  image_prompt?: string;
}

export interface ImagePromptSpec {
  scene_description: string;
  style: string;
  mood: string;
  color_palette: string[];
  text_overlay?: string;
  aspect_ratio: string;
  platform: string;
}

export interface CalendarDay {
  day: number;
  channel: string;
  asset_type: string;
  description: string;
}

export interface Campaign {
  brief: CampaignBrief;
  ad_copies: AdCopyVariant[];
  email_sequence: EmailInSequence[];
  social_posts: SocialPost[];
  image_prompts: ImagePromptSpec[];
  content_calendar: CalendarDay[];
  performance_predictions: {
    estimated_reach: string;
    estimated_ctr: string;
    estimated_conversion: string;
  };
  total_assets: number;
}

export const PLATFORM_COLORS: Record<AdPlatform | SocialPlatform, string> = {
  google: "#4285F4",
  facebook: "#1877F2",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  twitter: "#9CA3AF",
  tiktok: "#25F4EE",
};

export type GenerationPhase = "ads" | "emails" | "social" | "calendar";

export const PHASE_LABELS: Record<GenerationPhase, string> = {
  ads: "Ad copy variants",
  emails: "Email sequence",
  social: "Social posts",
  calendar: "Content calendar",
};
