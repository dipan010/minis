/** Three synthetic CSV datasets, generated deterministically (seeded PRNG)
 * so every load produces the same data. */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 365 days × 3 products, weekend-heavy weekly seasonality + holiday spikes. */
function electronicsCsv(): string {
  const rand = mulberry32(42);
  const rows = ["date,product,quantity,revenue"];
  const products = [
    { name: "Wireless Earbuds", base: 42, price: 79 },
    { name: "Smart Speaker", base: 25, price: 129 },
    { name: "Fitness Band", base: 33, price: 59 },
  ];
  const start = new Date("2025-07-01");
  for (let day = 0; day < 365; day++) {
    const d = new Date(start.getTime() + day * 86400_000);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 1.45 : dow === 5 ? 1.2 : 1.0;
    const month = d.getUTCMonth();
    const holiday =
      (month === 10 && d.getUTCDate() >= 24) || month === 11 ? 1.8 : month === 0 ? 0.8 : 1.0;
    for (const p of products) {
      const noise = 0.8 + rand() * 0.4;
      const qty = Math.round(p.base * weekend * holiday * noise);
      rows.push(`${iso(d)},${p.name},${qty},${qty * p.price}`);
    }
  }
  return rows.join("\n");
}

/** 180 days, strong start-of-month pattern, plus a 9-day supply disruption. */
function groceryCsv(): string {
  const rand = mulberry32(7);
  const rows = ["date,product,quantity,revenue"];
  const start = new Date("2026-01-01");
  for (let day = 0; day < 180; day++) {
    const d = new Date(start.getTime() + day * 86400_000);
    const dom = d.getUTCDate();
    const payday = dom <= 4 || (dom >= 15 && dom <= 17) ? 1.5 : 1.0;
    const weekend = d.getUTCDay() === 6 ? 1.3 : 1.0;
    // supply disruption: days 95-103 collapse to ~30%
    const disruption = day >= 95 && day <= 103 ? 0.3 : 1.0;
    const noise = 0.85 + rand() * 0.3;
    const qty = Math.round(520 * payday * weekend * disruption * noise);
    rows.push(`${iso(d)},Store Basket Units,${qty},${Math.round(qty * 3.4)}`);
  }
  return rows.join("\n");
}

/** 24 months of SaaS MRR: steady growth with small quarterly dips. */
function saasCsv(): string {
  const rand = mulberry32(99);
  const rows = ["date,product,quantity,revenue"];
  let mrr = 18000;
  for (let m = 0; m < 24; m++) {
    const d = new Date(Date.UTC(2024, 6 + m, 1));
    const growth = 1.035 + rand() * 0.02;
    mrr *= growth;
    const quarterDip = (m + 1) % 3 === 0 ? 0.97 : 1.0; // churn reviews at quarter end
    const value = Math.round(mrr * quarterDip);
    rows.push(`${iso(d)},CloudMetrics Pro MRR,${value},${value}`);
  }
  return rows.join("\n");
}

export interface SampleDataset {
  name: string;
  description: string;
  defaultHorizon: number;
  csv: string;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: "Electronics Store",
    description: "365 days × 3 products — weekend seasonality, holiday spikes",
    defaultHorizon: 30,
    csv: electronicsCsv(),
  },
  {
    name: "Grocery Chain",
    description: "180 days — payday patterns, a 9-day supply disruption",
    defaultHorizon: 21,
    csv: groceryCsv(),
  },
  {
    name: "SaaS Subscriptions",
    description: "24 months of MRR — steady growth, quarterly dips",
    defaultHorizon: 90,
    csv: saasCsv(),
  },
];
