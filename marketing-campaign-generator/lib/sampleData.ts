import type { CampaignBrief } from "./types";

/** Three sample briefs with fully-built customer segments. All fictional. */
export const SAMPLE_BRIEFS: { name: string; brief: CampaignBrief }[] = [
  {
    name: "FitTrack Pro (awareness)",
    brief: {
      product_name: "FitTrack Pro",
      product_description:
        "A fitness wearable with 14-day battery life, sleep-stage tracking, and coach-style weekly insights that turn raw metrics into plain-language advice.",
      campaign_goal: "awareness",
      budget_tier: "medium",
      duration: "3 weeks",
      brand_voice: "casual",
      key_message: "Your body has been talking. FitTrack Pro finally translates.",
      cta: "See your first week free",
      segment: {
        name: "Health-conscious millennials",
        demographics: {
          age_range: "27-40",
          gender_split: "55% female / 45% male",
          income_level: "middle to upper-middle",
          location_type: "urban and suburban",
        },
        psychographics: {
          interests: ["running", "home workouts", "sleep optimization", "wellness podcasts"],
          values: ["self-improvement", "evidence over hype", "work-life balance"],
          pain_points: [
            "fitness data feels meaningless",
            "abandoned trackers after 2 months",
            "poor sleep despite exercise",
          ],
          media_habits: ["Instagram reels", "podcasts on commute", "YouTube reviews before buying"],
        },
        behavioral: {
          purchase_frequency: "researches for weeks, buys seasonally",
          avg_order_value: "$120-180",
          preferred_channels: ["instagram", "email", "search"],
          brand_loyalty: "low — switches for better insights",
        },
      },
    },
  },
  {
    name: "CloudVault Enterprise (acquisition)",
    brief: {
      product_name: "CloudVault Enterprise",
      product_description:
        "B2B SaaS backup platform with immutable snapshots, 15-minute ransomware rollback, and compliance reporting for SOC 2 and HIPAA audits.",
      campaign_goal: "acquisition",
      budget_tier: "high",
      duration: "4 weeks",
      brand_voice: "professional",
      key_message: "When ransomware hits, you're 15 minutes from fine.",
      cta: "Book a recovery demo",
      segment: {
        name: "IT decision makers",
        demographics: {
          age_range: "35-55",
          gender_split: "70% male / 30% female",
          income_level: "high",
          location_type: "metro business hubs",
        },
        psychographics: {
          interests: ["infrastructure reliability", "security tooling", "vendor consolidation"],
          values: ["risk reduction", "auditability", "predictable pricing"],
          pain_points: [
            "backup restores that fail during incidents",
            "audit evidence gathering eats weeks",
            "board pressure on ransomware readiness",
          ],
          media_habits: ["LinkedIn", "industry newsletters", "webinars", "peer communities"],
        },
        behavioral: {
          purchase_frequency: "annual contracts, quarterly evaluations",
          avg_order_value: "$40k-120k ACV",
          preferred_channels: ["linkedin", "email", "search"],
          brand_loyalty: "high once integrated — hard to displace",
        },
      },
    },
  },
  {
    name: "Artisan Coffee Club (retention)",
    brief: {
      product_name: "Artisan Coffee Club",
      product_description:
        "A monthly specialty coffee subscription featuring single-origin roasts from independent roasters, with tasting notes and brew guides in every box.",
      campaign_goal: "retention",
      budget_tier: "low",
      duration: "2 weeks",
      brand_voice: "playful",
      key_message: "Your next favorite coffee is already on its way. Don't ghost it.",
      cta: "Keep my streak brewing",
      segment: {
        name: "At-risk subscribers (3+ months, engagement dropping)",
        demographics: {
          age_range: "25-45",
          gender_split: "50/50",
          income_level: "middle",
          location_type: "urban apartments, home offices",
        },
        psychographics: {
          interests: ["specialty coffee", "cooking", "small-batch products", "morning rituals"],
          values: ["supporting small makers", "discovery", "treating themselves"],
          pain_points: [
            "boxes piling up faster than they drink",
            "subscription fatigue",
            "forgot what made the club special",
          ],
          media_habits: ["email skimming", "Instagram stories", "TikTok food content"],
        },
        behavioral: {
          purchase_frequency: "monthly auto-renew, pause risk rising",
          avg_order_value: "$24/month",
          preferred_channels: ["email", "instagram", "tiktok"],
          brand_loyalty: "wavering — needs a reason to stay",
        },
      },
    },
  },
];
