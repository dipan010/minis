import type { DashboardReport, Platform, Sentiment, SocialPost, TopicCluster } from "./types";
import { analyzeSentiment, buildTrend } from "./analysis";

/** Compact post builder for the hand-written sample feeds. */
function post(
  id: string,
  platform: Platform,
  author: string,
  content: string,
  hoursAgo: number,
  sentiment: Sentiment,
  score: number,
  likes: number,
  shares: number,
  comments: number,
  topics: string[]
): SocialPost {
  return {
    id,
    platform,
    author,
    content,
    timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    sentiment,
    sentiment_score: score,
    engagement: { likes, shares, comments },
    topics,
  };
}

function buildReport(
  keyword: string,
  posts: SocialPost[],
  topics: TopicCluster[],
  insights: string[]
): DashboardReport {
  return {
    keyword,
    total_posts: posts.length,
    sentiment: analyzeSentiment(posts),
    posts,
    topics,
    trend: buildTrend(posts, "7d"),
    key_insights: insights,
    generated_at: new Date().toISOString(),
  };
}

// ─── Sample 1: iPhone 16 — mostly positive, battery complaints ───────────────

const IPHONE_POSTS: SocialPost[] = [
  post("post-1", "twitter", "@techdailygrace", "Two weeks with the iPhone 16 and the camera is genuinely the best I've used. Night shots look unreal 📸", 6, "positive", 0.8, 3200, 410, 190, ["camera quality"]),
  post("post-2", "twitter", "@mvv_reviews", "iPhone 16 battery draining 15% overnight on standby. Anyone else? This can't be normal.", 11, "negative", -0.7, 1850, 620, 540, ["battery life"]),
  post("post-3", "reddit", "u/pixelmigrant", "Switched from Android to the iPhone 16 last week. The ecosystem lock-in is real, but honestly the day-to-day smoothness won me over. Zero regrets so far, though I do miss a proper back button.", 20, "positive", 0.6, 940, 0, 210, ["switching experience"]),
  post("post-4", "news", "TechWire Daily", "iPhone 16 demand outpaces supply in first month — analysts point to camera upgrades as the key purchase driver.", 30, "positive", 0.5, 320, 480, 60, ["sales demand", "camera quality"]),
  post("post-5", "twitter", "@casualcarly", "the iphone 16 action button is such a small thing but i use it 50 times a day. why did this take so long lol", 41, "positive", 0.7, 780, 95, 44, ["action button"]),
  post("post-6", "reddit", "u/batterygate2", "PSA: if your iPhone 16 battery is draining fast, check the background app refresh settings after restoring from backup. Mine went from 6h to 9h screen-on time. Still think Apple should address the standby drain in an update though.", 47, "neutral", -0.1, 1520, 0, 380, ["battery life", "tips and fixes"]),
  post("post-7", "twitter", "@drainedanddone", "Third iPhone 16 battery complaint thread I've seen today. Mine's fine but the QC lottery seems real this year 🤷", 55, "negative", -0.4, 410, 120, 88, ["battery life", "quality control"]),
  post("post-8", "news", "Mobile Insider", "Teardown reveals iPhone 16 repairability improvements: battery adhesive redesign cuts replacement time in half.", 70, "positive", 0.4, 150, 210, 25, ["repairability"]),
  post("post-9", "reddit", "u/frugalphotog", "Is the iPhone 16 worth it coming from a 14 Pro? Camera aside, I'm not seeing a compelling reason to spend $999. Feels like an iterative year.", 84, "neutral", -0.15, 620, 0, 290, ["pricing", "upgrade value"]),
  post("post-10", "twitter", "@shipfastmara", "iPhone 16 pre-order arrived early AND my trade-in credit was higher than quoted. Small wins ✨", 96, "positive", 0.6, 210, 18, 12, ["buying experience"]),
  post("post-11", "twitter", "@notimpressed_t", "$999 and still 60Hz on the base iPhone 16 is honestly disrespectful in 2026", 110, "negative", -0.6, 2900, 870, 640, ["pricing", "display specs"]),
  post("post-12", "news", "Consumer Signal", "Early iPhone 16 owner survey: 87% satisfaction overall, with battery life the most-cited complaint at 9%.", 128, "neutral", 0.15, 95, 140, 18, ["battery life", "owner satisfaction"]),
  post("post-13", "reddit", "u/lenslover88", "Shot a whole wedding side-by-side with my mirrorless and the iPhone 16. Guests could not tell which photos came from the phone. Wild times.", 140, "positive", 0.85, 2100, 0, 460, ["camera quality"]),
  post("post-14", "twitter", "@updatewatcher", "iOS point release notes mention 'battery optimizations for iPhone 16'. So they know. Waiting to see if it actually helps.", 155, "neutral", 0.0, 530, 160, 95, ["battery life", "software updates"]),
];

const IPHONE_TOPICS: TopicCluster[] = [
  { topic: "battery life", count: 5, sentiment: -0.24, sample_posts: [IPHONE_POSTS[1].content, IPHONE_POSTS[5].content] },
  { topic: "camera quality", count: 3, sentiment: 0.72, sample_posts: [IPHONE_POSTS[0].content, IPHONE_POSTS[12].content] },
  { topic: "pricing", count: 2, sentiment: -0.38, sample_posts: [IPHONE_POSTS[10].content, IPHONE_POSTS[8].content] },
  { topic: "buying experience", count: 2, sentiment: 0.55, sample_posts: [IPHONE_POSTS[9].content, IPHONE_POSTS[3].content] },
  { topic: "repairability", count: 1, sentiment: 0.4, sample_posts: [IPHONE_POSTS[7].content] },
];

const IPHONE_INSIGHTS = [
  "Overall sentiment is solidly positive (camera praise dominates), but battery life is the single recurring negative theme and is compounding — three of the five highest-engagement negative posts are battery threads.",
  "The camera is the clearest marketing asset: organic side-by-side comparisons (wedding thread, night shots) are outperforming official messaging in engagement.",
  "Pricing criticism clusters on the base model's 60Hz display — a spec-gap narrative that is spreading on Twitter with high share counts.",
  "Reddit conversation is more constructive than Twitter: self-help battery fixes and switching stories suggest an opportunity for official troubleshooting content.",
  "The acknowledged 'battery optimizations' in release notes creates a watch item: if the update lands well, proactively amplifying it could convert the top negative theme into a recovery story.",
];

// ─── Sample 2: Remote Work Policy — polarized ────────────────────────────────

const REMOTE_POSTS: SocialPost[] = [
  post("post-1", "twitter", "@opsleadjordan", "Our new remote work policy: 3 days in office, no exceptions. Morale in the team channel is… not great.", 8, "negative", -0.6, 1400, 380, 520, ["return to office"]),
  post("post-2", "reddit", "u/asyncadvocate", "Remote work policy update at my company actually went the other way — fully flexible, results-based. Two quarters in and attrition is down 30%. It's almost like trusting adults works.", 18, "positive", 0.75, 3100, 0, 640, ["flexible policy", "retention"]),
  post("post-3", "news", "Workforce Journal", "Survey: 62% of knowledge workers would take a pay cut to keep a fully remote work policy, up from 54% last year.", 26, "neutral", 0.1, 210, 340, 45, ["worker preferences"]),
  post("post-4", "twitter", "@middlemgrmike", "Hot take: hybrid remote work policies fail because they import the worst of both worlds. Commute AND Zoom calls from a phone booth.", 36, "negative", -0.5, 2200, 510, 480, ["hybrid friction"]),
  post("post-5", "twitter", "@foundermeg", "We wrote our remote work policy in one page: 'Be excellent, be reachable 4 hours overlap, ship.' Best retention year we've ever had.", 50, "positive", 0.8, 1900, 260, 210, ["flexible policy", "retention"]),
  post("post-6", "reddit", "u/commutercrisis", "New remote work policy means I'm back to 90 minutes each way, twice a... three times a week. Doing the math, that's 470 hours a year of unpaid commuting. Updating my resume this weekend.", 61, "negative", -0.85, 4200, 0, 890, ["return to office", "commuting costs"]),
  post("post-7", "news", "Business Ledger", "Major insurer reverses remote work policy after losing two senior engineering teams to fully-distributed competitors.", 76, "neutral", -0.1, 380, 520, 95, ["talent competition"]),
  post("post-8", "twitter", "@quietlyquitting", "the remote work policy debate is just a proxy war over whether management trusts output metrics or eyeballs", 90, "neutral", 0.0, 980, 240, 160, ["management trust"]),
  post("post-9", "reddit", "u/officefanclub", "Unpopular opinion apparently: I LIKE our stricter remote work policy. As a junior dev, being in the room with seniors 3 days a week has taught me more in 6 months than 2 years of remote onboarding.", 104, "positive", 0.6, 1650, 0, 720, ["mentorship", "return to office"]),
  post("post-10", "twitter", "@hrwatchdog", "Reminder that every 'remote work policy' announcement thread has execs replying from vacation homes", 118, "negative", -0.4, 3600, 1100, 430, ["management trust"]),
  post("post-11", "news", "The Daily Brief", "City center businesses report 18% foot-traffic recovery as return-to-office policies take hold in the financial district.", 134, "positive", 0.3, 140, 180, 22, ["local economy"]),
  post("post-12", "reddit", "u/dataoverdogma", "Our company published the actual data behind the remote work policy decision: collaboration scores flat, promotion velocity lower for remote juniors, retention higher for remote seniors. Refreshing to see nuance instead of mandates.", 150, "neutral", 0.2, 2400, 0, 510, ["policy data", "mentorship"]),
];

const REMOTE_TOPICS: TopicCluster[] = [
  { topic: "return to office", count: 4, sentiment: -0.28, sample_posts: [REMOTE_POSTS[0].content, REMOTE_POSTS[5].content] },
  { topic: "flexible policy", count: 2, sentiment: 0.78, sample_posts: [REMOTE_POSTS[1].content, REMOTE_POSTS[4].content] },
  { topic: "management trust", count: 2, sentiment: -0.2, sample_posts: [REMOTE_POSTS[7].content, REMOTE_POSTS[9].content] },
  { topic: "mentorship", count: 2, sentiment: 0.4, sample_posts: [REMOTE_POSTS[8].content, REMOTE_POSTS[11].content] },
  { topic: "retention", count: 2, sentiment: 0.78, sample_posts: [REMOTE_POSTS[1].content, REMOTE_POSTS[4].content] },
];

const REMOTE_INSIGHTS = [
  "Sentiment is sharply polarized rather than negative: flexible-policy stories earn the highest positive engagement while mandate announcements drive the highest negative engagement — the middle ground gets little airtime.",
  "The commuting-cost frame ('470 unpaid hours a year') is the single most viral negative artifact and is being reused across threads; expect it in any coverage of RTO mandates.",
  "A credible pro-office constituency exists — junior employees citing mentorship — and it is underrepresented in the loudest threads; it offers a more defensible narrative than executive mandates.",
  "Companies publishing the data behind policy decisions (promotion velocity, retention splits) are the only actors earning cross-camp respect; transparency reads as trust.",
  "Talent-competition stories (teams leaving for distributed competitors) are moving from anecdote to news coverage — a material recruiting-risk signal for strict-RTO employers.",
];

// ─── Sample 3: Climate Summit 2026 — negative-leaning, politically charged ──

const CLIMATE_POSTS: SocialPost[] = [
  post("post-1", "news", "Global Wire", "Climate Summit 2026 opens amid record attendance — and record skepticism, as 40% of pledged 2024 commitments remain unreported.", 9, "negative", -0.4, 450, 680, 130, ["pledge accountability"]),
  post("post-2", "twitter", "@gretawatcher", "Day 2 of Climate Summit 2026 and the fossil fuel lobby badge count is higher than the small island states delegation. Again.", 16, "negative", -0.75, 5200, 1900, 720, ["lobbying influence"]),
  post("post-3", "reddit", "u/gridengineer", "Actual good news buried under the Climate Summit 2026 noise: the grid interconnection financing deal got signed by 14 countries. This is the unglamorous stuff that actually decarbonizes.", 28, "positive", 0.7, 2800, 0, 460, ["climate finance", "grid infrastructure"]),
  post("post-4", "twitter", "@carbonpolicywonk", "Climate Summit 2026 draft text watch: 'phase out' has become 'transition away from' has become 'recognize the need to consider'. Language erosion in real time.", 39, "negative", -0.6, 3400, 1200, 380, ["negotiation language"]),
  post("post-5", "news", "The Morning Post", "Protest crowds outside Climate Summit 2026 swell to 80,000 as youth coalitions demand binding enforcement mechanisms.", 52, "neutral", -0.1, 310, 540, 85, ["protests"]),
  post("post-6", "twitter", "@energyrealist", "Unpopular but: Climate Summit 2026 pledges on methane monitoring are genuinely enforceable this time. Satellite verification changes the game. Credit where due.", 66, "positive", 0.55, 1200, 340, 290, ["methane monitoring", "pledge accountability"]),
  post("post-7", "reddit", "u/despairandrepair", "Every Climate Summit the same cycle: hope, leaks, watered-down text, 'progress was made'. I've stopped expecting summits to save us and started volunteering on local adaptation projects instead. Recommend it for the doomscroll blues.", 80, "negative", -0.35, 1900, 0, 530, ["summit fatigue", "local action"]),
  post("post-8", "twitter", "@islandvoices", "Our delegation came to Climate Summit 2026 with loss-and-damage receipts. The fund pledged in 2022 has disbursed 4% of commitments. Four percent.", 95, "negative", -0.8, 4600, 2100, 510, ["climate finance", "pledge accountability"]),
  post("post-9", "news", "Economic Observer", "Climate Summit 2026 sidebar: private capital coalition announces $120B green industrial fund, the largest single-summit financing commitment to date.", 110, "positive", 0.45, 260, 390, 40, ["climate finance"]),
  post("post-10", "twitter", "@memelordkev", "climate summit 2026 is 10,000 people flying in to agree the real work will happen at climate summit 2027", 122, "negative", -0.5, 8900, 3400, 610, ["summit fatigue"]),
  post("post-11", "reddit", "u/policynerdpriya", "Reading the actual Climate Summit 2026 adaptation finance annex so you don't have to: the reporting template is standardized for the first time, which sounds boring but means pledges are finally comparable year over year.", 138, "neutral", 0.25, 1400, 0, 260, ["pledge accountability", "climate finance"]),
  post("post-12", "news", "State Affairs Desk", "Negotiating blocs remain split on fossil fuel language as Climate Summit 2026 enters final 48 hours; ministers signal an extension is likely.", 150, "neutral", -0.15, 380, 420, 70, ["negotiation language"]),
];

const CLIMATE_TOPICS: TopicCluster[] = [
  { topic: "pledge accountability", count: 4, sentiment: -0.25, sample_posts: [CLIMATE_POSTS[0].content, CLIMATE_POSTS[7].content] },
  { topic: "climate finance", count: 4, sentiment: 0.15, sample_posts: [CLIMATE_POSTS[8].content, CLIMATE_POSTS[2].content] },
  { topic: "summit fatigue", count: 2, sentiment: -0.43, sample_posts: [CLIMATE_POSTS[9].content, CLIMATE_POSTS[6].content] },
  { topic: "negotiation language", count: 2, sentiment: -0.38, sample_posts: [CLIMATE_POSTS[3].content, CLIMATE_POSTS[11].content] },
  { topic: "lobbying influence", count: 1, sentiment: -0.75, sample_posts: [CLIMATE_POSTS[1].content] },
];

const CLIMATE_INSIGHTS = [
  "The conversation is negative-leaning and accountability-focused: the highest-engagement posts attack the gap between pledges and disbursement (the '4%' loss-and-damage post is the most-shared item in the sample).",
  "Satire about summit theater ('agree the real work will happen at summit 2027') is the most viral single post — fatigue humor now outperforms outrage in reach.",
  "Positive sentiment exists but is concentrated in technical wins (grid financing, methane satellite verification, standardized reporting) surfaced by expert accounts rather than official channels.",
  "Finance is the swing topic: it hosts both the strongest criticism (undisbursed funds) and the strongest positives ($120B private fund), making it the highest-leverage communication battleground.",
  "Watch the language-erosion thread — screenshots of successive draft texts are becoming a shareable artifact that frames the summit's outcome before the final communiqué lands.",
];

/** Three pre-built reports so the dashboard demos instantly without Ollama. */
export const SAMPLE_REPORTS: DashboardReport[] = [
  buildReport("iPhone 16", IPHONE_POSTS, IPHONE_TOPICS, IPHONE_INSIGHTS),
  buildReport("Remote Work Policy", REMOTE_POSTS, REMOTE_TOPICS, REMOTE_INSIGHTS),
  buildReport("Climate Summit 2026", CLIMATE_POSTS, CLIMATE_TOPICS, CLIMATE_INSIGHTS),
];
