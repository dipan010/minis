# Personalized Marketing Campaign Generator

Input a campaign brief + a customer segment → generate a **complete
campaign**: 6 A/B ad copy variants (Google / Facebook / LinkedIn), a
5-email drip sequence with rendered HTML previews, 8 platform-native social
posts, text-to-image prompt specs with palette swatches, a day-by-day
content calendar, and ballpark performance predictions. Inspired by PODS
and Hotmob.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 (dark agency theme, platform accent colors) |
| LLM runtime | Ollama — `llama3.1:8b` |

## Prerequisites

- Node.js 18.18+
- Ollama running locally with `ollama pull llama3.1:8b`

## Setup

```bash
npm install
npm run dev
```

---

## Usage

1. Load a sample brief — **FitTrack Pro** (fitness wearable, awareness,
   casual voice), **CloudVault Enterprise** (B2B SaaS, acquisition,
   professional), or **Artisan Coffee Club** (subscription retention,
   playful) — or fill in product info, campaign settings, and the
   three-part segment form (demographics / psychographics / behavioral).
2. Click **Generate Campaign**. Four sequential LLM calls run
   (ads → emails → social → calendar; the step indicator paces itself on a
   timer since the API is a single request). Expect a few minutes on CPU;
   the pipeline caps at ~5 minutes.
3. Explore the tabbed output:
   - **Overview** — asset count, performance predictions, content calendar.
   - **Ad Copy** — platform-styled preview cards with live character
     counts against per-platform limits and each variant's A/B rationale.
   - **Email Sequence** — timeline of 5 emails; click one for a mock
     phone-width inbox rendering of its HTML with personalization tokens.
   - **Social Posts** — platform-accented cards with hashtags, best posting
     time, content-type badge, and collapsible image prompt.
   - **Image Prompts** — the specs (scene, style, mood, hex palette
     swatches, aspect ratio) meant to be pasted into Midjourney/DALL-E.
4. **Export all** downloads every asset as one Markdown file.

---

## Architecture

### `lib/campaignGenerator.ts`
Four sequential schema-constrained Ollama calls, kept separate to fit the
local model's context window:
1. **generateAdCopies** — exactly 6 variants (2 per platform) with hard
   character limits in the prompt; counts are computed in code and the UI
   flags overruns.
2. **generateEmailSequence** — 5 emails with an arc matched to the campaign
   goal, ascending `send_day`s, simple inline-styled HTML (p/h2/a/strong
   only), and `{{first_name}}`-style tokens.
3. **generateSocialPosts** — 8 posts across twitter/instagram/linkedin/
   tiktok with platform-native formatting; image/carousel/video posts carry
   a full image-prompt spec, which is also split out into the campaign's
   `image_prompts` gallery.
4. **generateCalendar** — maps all assets (email send days pinned) onto a
   10–30 entry calendar plus ballpark performance predictions.

### `app/api/generate/route.ts`
POST `{ brief }` → `Campaign`, ~5-minute overall timeout over the four
calls.

### Components
`AdCopyCard` (platform-styled preview + char counters), `EmailPreview`
(timeline + mock inbox rendering the generated HTML), `SocialPostCard`,
`ImagePromptCard` (palette swatches), `ContentCalendar` (table),
`CampaignProgress` (4-step indicator).

---

## Caveats

- **All content is AI-generated**; no real customer data is used anywhere.
- **Performance predictions are illustrative** LLM guesses, not media-plan
  arithmetic.
- Email HTML is simplified and **not tested across email clients** — treat
  it as a draft, not production markup.
- An 8B model sometimes misses character limits (the UI flags overruns in
  red) or platform tone; regenerate for variety.
- Portfolio demonstration project only.
