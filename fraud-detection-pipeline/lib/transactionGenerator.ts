import type { Transaction, TxCategory, TxChannel } from "./types";
import { CITY_COORDS, CUSTOMER_PROFILES } from "./customerProfiles";

const MERCHANTS: Record<TxCategory, string[]> = {
  retail: ["Northline Outfitters", "Casa Verde Home", "UrbanKart", "Maple & Main"],
  travel: ["SkyBridge Airlines", "TransitGo", "Harbor Hotels", "RailLink"],
  food: ["Daily Grind Coffee", "Spice Route Kitchen", "GreenBowl", "Corner Deli 24"],
  transfer: ["P2P Transfer", "WireDirect", "QuickSend"],
  atm: ["ATM Withdrawal", "ATM Cash Point"],
  online: ["Streamly", "CloudMart", "AppStore Purchase", "GameHub"],
};

const FOREIGN_CITIES = ["Lagos", "Singapore", "Dubai", "Moscow"];
const CITY_COUNTRY: Record<string, string> = {
  Lagos: "NG",
  Singapore: "SG",
  Dubai: "AE",
  Moscow: "RU",
};

const CHANNELS_BY_CATEGORY: Record<TxCategory, TxChannel[]> = {
  retail: ["pos", "mobile"],
  travel: ["online", "pos"],
  food: ["pos", "mobile"],
  transfer: ["online", "mobile"],
  atm: ["atm"],
  online: ["online", "mobile"],
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(base: number, spread: number): number {
  return Math.max(1, base * (1 - spread + Math.random() * spread * 2));
}

export type TxIntent = "normal" | "suspicious" | "fraudulent";

/** Stateful generator: keeps per-customer transaction history so the
 * scoring layer can detect velocity, travel, and pattern anomalies
 * relative to each customer's baseline. */
export class TransactionGenerator {
  private counter = 0;
  private history = new Map<string, Transaction[]>();

  historyFor(customerId: string): Transaction[] {
    return this.history.get(customerId) ?? [];
  }

  generateTransaction(): Transaction {
    const roll = Math.random();
    const intent: TxIntent = roll < 0.85 ? "normal" : roll < 0.95 ? "suspicious" : "fraudulent";
    return this.generateWithIntent(intent);
  }

  generateBatch(count: number): Transaction[] {
    return Array.from({ length: count }, () => this.generateTransaction());
  }

  generateWithIntent(intent: TxIntent): Transaction {
    const profile = pick(CUSTOMER_PROFILES);
    this.counter += 1;

    let category: TxCategory;
    let amount: number;
    let city = profile.home_city;
    let country = profile.home_country;
    let timestamp = new Date();

    if (intent === "normal") {
      category = pick(profile.usual_categories);
      amount = jitter(profile.avg_amount, 0.5);
    } else if (intent === "suspicious") {
      // one anomaly: unusual amount, off-profile category, or a late hour
      const anomaly = pick(["amount", "category", "time"] as const);
      category = anomaly === "category"
        ? pick((Object.keys(MERCHANTS) as TxCategory[]).filter((c) => !profile.usual_categories.includes(c)))
        : pick(profile.usual_categories);
      amount = anomaly === "amount" ? jitter(profile.avg_amount * 4.5, 0.3) : jitter(profile.avg_amount, 0.5);
      if (anomaly === "time") {
        // force local time to ~3am
        const localHour = (timestamp.getUTCHours() + profile.tz_offset + 24) % 24;
        const shift = (3 - localHour + 24) % 24;
        timestamp = new Date(timestamp.getTime() + shift * 3600_000);
      }
    } else {
      // fraudulent: compounded anomalies — foreign city + big/round amount
      category = pick(["transfer", "online", "atm"] as const);
      city = pick(FOREIGN_CITIES);
      country = CITY_COUNTRY[city];
      amount =
        category === "transfer"
          ? pick([1000, 2000, 2500, 5000]) // round-number transfer
          : jitter(profile.avg_amount * 9, 0.4);
    }

    const tx: Transaction = {
      id: `TX-${String(this.counter).padStart(6, "0")}`,
      timestamp: timestamp.toISOString(),
      amount: Number(amount.toFixed(2)),
      currency: profile.currency,
      merchant: pick(MERCHANTS[category]),
      category,
      card_last4: profile.card_last4,
      customer_id: profile.id,
      location: CITY_COORDS[city] ? { city, country } : { city: profile.home_city, country: profile.home_country },
      channel: pick(CHANNELS_BY_CATEGORY[category]),
    };

    const list = this.history.get(profile.id) ?? [];
    list.push(tx);
    if (list.length > 100) list.shift();
    this.history.set(profile.id, list);

    return tx;
  }
}
