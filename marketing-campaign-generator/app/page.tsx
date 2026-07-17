"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BrandVoice,
  BudgetTier,
  Campaign,
  CampaignBrief,
  CampaignGoal,
  GenerationPhase,
} from "@/lib/types";
import { SAMPLE_BRIEFS } from "@/lib/sampleData";
import AdCopyCard from "@/components/AdCopyCard";
import EmailPreview from "@/components/EmailPreview";
import SocialPostCard from "@/components/SocialPostCard";
import ImagePromptCard from "@/components/ImagePromptCard";
import ContentCalendar from "@/components/ContentCalendar";
import CampaignProgress from "@/components/CampaignProgress";

const EMPTY_BRIEF: CampaignBrief = {
  product_name: "",
  product_description: "",
  campaign_goal: "awareness",
  budget_tier: "medium",
  duration: "3 weeks",
  brand_voice: "casual",
  key_message: "",
  cta: "",
  segment: {
    name: "",
    demographics: { age_range: "", gender_split: "", income_level: "", location_type: "" },
    psychographics: { interests: [], values: [], pain_points: [], media_habits: [] },
    behavioral: {
      purchase_frequency: "",
      avg_order_value: "",
      preferred_channels: [],
      brand_loyalty: "",
    },
  },
};

type Tab = "overview" | "ads" | "emails" | "social" | "images";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "ads", label: "Ad Copy" },
  { id: "emails", label: "Email Sequence" },
  { id: "social", label: "Social Posts" },
  { id: "images", label: "Image Prompts" },
];

function campaignToMarkdown(campaign: Campaign): string {
  const lines: string[] = [];
  const b = campaign.brief;
  lines.push(`# Campaign — ${b.product_name}`);
  lines.push("");
  lines.push(
    `_${b.campaign_goal} · ${b.budget_tier} budget · ${b.duration} · ${b.brand_voice} voice · segment "${b.segment.name}" · ${campaign.total_assets} assets. All content AI-generated._`
  );
  lines.push("");
  lines.push(`**Key message:** ${b.key_message}`);
  lines.push(`**CTA:** ${b.cta}`);
  lines.push("");
  lines.push("## Performance predictions (illustrative)");
  lines.push("");
  lines.push(`- Reach: ${campaign.performance_predictions.estimated_reach}`);
  lines.push(`- CTR: ${campaign.performance_predictions.estimated_ctr}`);
  lines.push(`- Conversion: ${campaign.performance_predictions.estimated_conversion}`);
  lines.push("");
  lines.push("## Ad copy");
  lines.push("");
  campaign.ad_copies.forEach((ad, i) => {
    lines.push(`### ${i + 1}. ${ad.platform} — ${ad.headline}`);
    lines.push("");
    lines.push(ad.body);
    lines.push("");
    lines.push(`- CTA: ${ad.cta}`);
    lines.push(`- A/B angle: ${ad.a_b_rationale}`);
    lines.push("");
  });
  lines.push("## Email sequence");
  lines.push("");
  campaign.email_sequence.forEach((email, i) => {
    lines.push(`### Email ${i + 1} (day ${email.send_day}): ${email.subject}`);
    lines.push("");
    lines.push(`_Preview: ${email.preview_text}_ · ${email.purpose}`);
    lines.push("");
    lines.push("```html");
    lines.push(email.body_html);
    lines.push("```");
    lines.push("");
  });
  lines.push("## Social posts");
  lines.push("");
  campaign.social_posts.forEach((post, i) => {
    lines.push(`### ${i + 1}. ${post.platform} (${post.content_type}) — ${post.best_time}`);
    lines.push("");
    lines.push(post.copy);
    if (post.hashtags.length) lines.push(post.hashtags.map((h) => `#${h}`).join(" "));
    lines.push("");
  });
  lines.push("## Image prompts (for Midjourney / DALL-E)");
  lines.push("");
  campaign.image_prompts.forEach((spec, i) => {
    lines.push(
      `${i + 1}. **${spec.platform}** (${spec.aspect_ratio}): ${spec.scene_description} Style: ${spec.style}. Mood: ${spec.mood}. Palette: ${spec.color_palette.join(", ")}.${spec.text_overlay ? ` Overlay: "${spec.text_overlay}".` : ""}`
    );
  });
  lines.push("");
  lines.push("## Content calendar");
  lines.push("");
  lines.push("| Day | Channel | Asset | Description |");
  lines.push("|---:|---|---|---|");
  campaign.content_calendar.forEach((d) =>
    lines.push(`| ${d.day} | ${d.channel} | ${d.asset_type} | ${d.description} |`)
  );
  lines.push("");
  return lines.join("\n");
}

const inputCls =
  "w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-accent";
const labelCls = "block text-[11px] font-medium text-ink-soft mb-1";

function ListInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label} (comma-separated)</label>
      <input
        className={inputCls}
        value={values.join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
      />
    </div>
  );
}

export default function Home() {
  const [brief, setBrief] = useState<CampaignBrief>(EMPTY_BRIEF);
  const [showSegment, setShowSegment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<GenerationPhase>("ads");
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (phaseTimer.current) clearInterval(phaseTimer.current);
  }, []);

  function patch(p: Partial<CampaignBrief>) {
    setBrief((prev) => ({ ...prev, ...p }));
  }
  function patchSegment(p: Partial<CampaignBrief["segment"]>) {
    setBrief((prev) => ({ ...prev, segment: { ...prev.segment, ...p } }));
  }

  function loadSample(index: number) {
    setBrief(JSON.parse(JSON.stringify(SAMPLE_BRIEFS[index].brief)) as CampaignBrief);
    setShowSegment(true);
    setError(null);
  }

  const canSubmit =
    brief.product_name.trim().length > 0 &&
    brief.product_description.trim().length > 20 &&
    brief.segment.name.trim().length > 0 &&
    !loading;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCampaign(null);
    setTab("overview");

    // The API is one request for all four phases, so pace the step indicator
    // on a timer as a best-effort reflection of server progress.
    const phases: GenerationPhase[] = ["ads", "emails", "social", "calendar"];
    let phaseIndex = 0;
    setPhase("ads");
    phaseTimer.current = setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, phases.length - 1);
      setPhase(phases[phaseIndex]);
    }, 45_000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setCampaign(data as Campaign);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (phaseTimer.current) clearInterval(phaseTimer.current);
      phaseTimer.current = null;
      setLoading(false);
    }
  }

  function handleExport() {
    if (!campaign) return;
    const blob = new Blob([campaignToMarkdown(campaign)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${campaign.brief.product_name.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header + input ── */}
        <div className="panel p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <div>
              <h1 className="text-lg font-semibold">
                Marketing Campaign Generator
              </h1>
              <p className="text-[13px] text-ink-soft">
                Brief + segment → ad variants, drip emails, social posts, image
                prompts, and a content calendar. Local Ollama, four generation
                phases.
              </p>
            </div>
            <div className="flex gap-2">
              {SAMPLE_BRIEFS.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => loadSample(i)}
                  className="rounded-md border border-line px-3 py-1 text-[12px] hover:border-accent hover:text-accent transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Product info */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Product name</label>
                  <input
                    className={inputCls}
                    value={brief.product_name}
                    onChange={(e) => patch({ product_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>CTA</label>
                  <input
                    className={inputCls}
                    value={brief.cta}
                    onChange={(e) => patch({ cta: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Product description</label>
                <textarea
                  className={`${inputCls} resize-y min-h-16`}
                  value={brief.product_description}
                  onChange={(e) => patch({ product_description: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Key message</label>
                <input
                  className={inputCls}
                  value={brief.key_message}
                  onChange={(e) => patch({ key_message: e.target.value })}
                />
              </div>
            </div>

            {/* Campaign settings */}
            <div className="grid grid-cols-2 gap-3 content-start">
              <div>
                <label className={labelCls}>Goal</label>
                <select
                  className={inputCls}
                  value={brief.campaign_goal}
                  onChange={(e) => patch({ campaign_goal: e.target.value as CampaignGoal })}
                >
                  {["awareness", "acquisition", "retention", "upsell"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Budget tier</label>
                <select
                  className={inputCls}
                  value={brief.budget_tier}
                  onChange={(e) => patch({ budget_tier: e.target.value as BudgetTier })}
                >
                  {["low", "medium", "high"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Duration</label>
                <input
                  className={inputCls}
                  value={brief.duration}
                  onChange={(e) => patch({ duration: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Brand voice</label>
                <select
                  className={inputCls}
                  value={brief.brand_voice}
                  onChange={(e) => patch({ brand_voice: e.target.value as BrandVoice })}
                >
                  {["professional", "casual", "playful", "luxury", "bold"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Segment (collapsible) */}
          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowSegment((v) => !v)}
              className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
            >
              {showSegment ? "▲" : "▼"} Customer segment
              {brief.segment.name && (
                <span className="ml-2 text-accent normal-case">{brief.segment.name}</span>
              )}
            </button>
            {showSegment && (
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-line p-3 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                    Demographics
                  </p>
                  <div>
                    <label className={labelCls}>Segment name</label>
                    <input
                      className={inputCls}
                      value={brief.segment.name}
                      onChange={(e) => patchSegment({ name: e.target.value })}
                    />
                  </div>
                  {(
                    [
                      ["age_range", "Age range"],
                      ["gender_split", "Gender split"],
                      ["income_level", "Income level"],
                      ["location_type", "Location type"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <input
                        className={inputCls}
                        value={brief.segment.demographics[key]}
                        onChange={(e) =>
                          patchSegment({
                            demographics: { ...brief.segment.demographics, [key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-line p-3 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                    Psychographics
                  </p>
                  {(
                    [
                      ["interests", "Interests"],
                      ["values", "Values"],
                      ["pain_points", "Pain points"],
                      ["media_habits", "Media habits"],
                    ] as const
                  ).map(([key, label]) => (
                    <ListInput
                      key={key}
                      label={label}
                      values={brief.segment.psychographics[key]}
                      onChange={(values) =>
                        patchSegment({
                          psychographics: { ...brief.segment.psychographics, [key]: values },
                        })
                      }
                    />
                  ))}
                </div>

                <div className="rounded-lg border border-line p-3 space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-accent">
                    Behavioral
                  </p>
                  {(
                    [
                      ["purchase_frequency", "Purchase frequency"],
                      ["avg_order_value", "Avg order value"],
                      ["brand_loyalty", "Brand loyalty"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <input
                        className={inputCls}
                        value={brief.segment.behavioral[key]}
                        onChange={(e) =>
                          patchSegment({
                            behavioral: { ...brief.segment.behavioral, [key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                  <ListInput
                    label="Preferred channels"
                    values={brief.segment.behavioral.preferred_channels}
                    onChange={(values) =>
                      patchSegment({
                        behavioral: { ...brief.segment.behavioral, preferred_channels: values },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleGenerate}
              className="rounded-md bg-accent text-base font-medium text-sm px-6 py-2 text-[#1F0A14] transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {loading ? "Generating…" : "Generate Campaign"}
            </button>
            {loading && <CampaignProgress active={phase} />}
          </div>
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>

        {/* ── Output ── */}
        {campaign && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-full border border-line bg-card p-1 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`font-mono text-[11px] uppercase tracking-wide px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                      tab === t.id ? "bg-accent text-[#1F0A14]" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-accent transition-colors"
              >
                ↓ Export all
              </button>
            </div>

            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Total assets", value: String(campaign.total_assets) },
                    { label: "Est. reach", value: campaign.performance_predictions.estimated_reach },
                    { label: "Est. CTR", value: campaign.performance_predictions.estimated_ctr },
                    { label: "Est. conversion", value: campaign.performance_predictions.estimated_conversion },
                  ].map((card) => (
                    <div key={card.label} className="panel p-4">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-soft">
                        {card.label}
                      </p>
                      <p className="text-sm font-bold mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="panel p-5">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
                    Content calendar — {campaign.brief.duration}
                  </p>
                  <ContentCalendar calendar={campaign.content_calendar} />
                </div>
                <p className="text-[11px] text-ink-soft text-center">
                  Performance predictions are illustrative LLM estimates, not
                  media-plan math.
                </p>
              </div>
            )}

            {tab === "ads" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {campaign.ad_copies.map((ad, i) => (
                  <AdCopyCard
                    key={i}
                    ad={ad}
                    variantLabel={`Variant ${(i % 2) + 1}`}
                  />
                ))}
              </div>
            )}

            {tab === "emails" && (
              <div className="relative">
                {/* timeline spine */}
                <span className="absolute left-4 top-2 bottom-2 w-px bg-line" />
                <div className="space-y-3">
                  {campaign.email_sequence.map((email, i) => (
                    <EmailPreview key={i} email={email} index={i} />
                  ))}
                </div>
              </div>
            )}

            {tab === "social" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {campaign.social_posts.map((post, i) => (
                  <SocialPostCard key={i} post={post} />
                ))}
              </div>
            )}

            {tab === "images" && (
              <div>
                <p className="text-[12px] text-ink-soft mb-3">
                  These are <span className="text-accent">text prompts</span> for
                  an image model (Midjourney, DALL-E, etc.) — no images are
                  generated in this app.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaign.image_prompts.map((spec, i) => (
                    <ImagePromptCard key={i} spec={spec} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-ink-soft text-center pb-2">
          All campaign content is AI-generated. No real customer data is used.
          Portfolio demonstration only.
        </p>
      </main>
    </div>
  );
}
