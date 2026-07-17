import { mean, std } from "mathjs";
import type { CustomerProfile, FraudResult, FraudSignal, Transaction } from "./types";
import { CITY_COORDS, PROFILES_BY_ID } from "./customerProfiles";

/** Great-circle distance in km. */
function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** >3 transactions from the same card within 5 minutes. */
export function velocityCheck(tx: Transaction, history: Transaction[]): FraudSignal | null {
  const windowStart = new Date(tx.timestamp).getTime() - 5 * 60_000;
  const recent = history.filter(
    (h) => h.id !== tx.id && new Date(h.timestamp).getTime() >= windowStart
  );
  if (recent.length >= 3) {
    return {
      type: "velocity",
      score: Math.min(30, 12 + recent.length * 4),
      detail: `${recent.length + 1} transactions on this card within 5 minutes.`,
    };
  }
  return null;
}

/** Amount vs the customer's baseline (profile average, sharpened by
 * observed history mean/std when enough data exists). */
export function amountCheck(
  tx: Transaction,
  profile: CustomerProfile,
  history: Transaction[]
): FraudSignal | null {
  const amounts = history.filter((h) => h.id !== tx.id).map((h) => h.amount);
  const baseline = amounts.length >= 5 ? Number(mean(amounts)) : profile.avg_amount;
  const ratio = tx.amount / Math.max(1, baseline);

  if (ratio > 3) {
    const deviation =
      amounts.length >= 5
        ? ` (${((tx.amount - baseline) / Math.max(1, Number(std(amounts, "unbiased")))).toFixed(1)}σ above observed mean)`
        : "";
    return {
      type: "amount",
      score: Math.min(30, Math.round(8 + ratio * 3)),
      detail: `Amount ${tx.amount.toFixed(2)} ${tx.currency} is ${ratio.toFixed(1)}× this customer's baseline of ~${baseline.toFixed(0)}${deviation}.`,
    };
  }
  return null;
}

/** Impossible travel: distance/time from the previous transaction implies
 * a speed over 900 km/h. */
export function locationCheck(tx: Transaction, history: Transaction[]): FraudSignal | null {
  const prev = [...history].reverse().find((h) => h.id !== tx.id);
  if (!prev || prev.location.city === tx.location.city) return null;

  const from = CITY_COORDS[prev.location.city];
  const to = CITY_COORDS[tx.location.city];
  if (!from || !to) return null;

  const km = haversineKm(from, to);
  const hours = Math.max(
    (new Date(tx.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3600_000,
    1 / 60
  );
  const speed = km / hours;

  if (speed > 900) {
    return {
      type: "location",
      score: Math.min(30, Math.round(15 + speed / 400)),
      detail: `Impossible travel: ${prev.location.city} → ${tx.location.city} (${km.toFixed(0)} km) implies ${speed.toFixed(0)} km/h.`,
    };
  }
  if (km > 3000) {
    return {
      type: "location",
      score: 10,
      detail: `Long-distance jump: ${prev.location.city} → ${tx.location.city} (${km.toFixed(0)} km) since the previous transaction.`,
    };
  }
  return null;
}

/** Unusual hour (01:00–05:00) in the customer's home timezone. */
export function timeCheck(tx: Transaction, profile: CustomerProfile): FraudSignal | null {
  const utcHour = new Date(tx.timestamp).getUTCHours() + new Date(tx.timestamp).getUTCMinutes() / 60;
  const localHour = (utcHour + profile.tz_offset + 24) % 24;
  if (localHour >= 1 && localHour < 5) {
    return {
      type: "time",
      score: 12,
      detail: `Transaction at ~${Math.floor(localHour)}:00 local time — outside this customer's normal activity hours.`,
    };
  }
  return null;
}

/** Category off the customer's usual profile. */
export function patternCheck(tx: Transaction, profile: CustomerProfile): FraudSignal | null {
  if (!profile.usual_categories.includes(tx.category)) {
    const isRisky = tx.category === "transfer" || tx.category === "atm";
    return {
      type: "pattern",
      score: isRisky ? 15 : 8,
      detail: `Category "${tx.category}" is outside this customer's usual profile (${profile.usual_categories.join(", ")}).`,
    };
  }
  return null;
}

/** Run all checks, aggregate (capped at 100), and derive the action.
 * Purely statistical — no LLM involved. */
export function scoreTransaction(
  tx: Transaction,
  history: Transaction[]
): Omit<FraudResult, "explanation"> {
  const profile = PROFILES_BY_ID.get(tx.customer_id);
  const signals: FraudSignal[] = [];

  if (profile) {
    for (const signal of [
      velocityCheck(tx, history),
      amountCheck(tx, profile, history),
      locationCheck(tx, history),
      timeCheck(tx, profile),
      patternCheck(tx, profile),
    ]) {
      if (signal) signals.push(signal);
    }
    // round-number transfers are a classic mule pattern
    if (tx.category === "transfer" && tx.amount >= 500 && tx.amount % 500 === 0) {
      signals.push({
        type: "pattern",
        score: 10,
        detail: `Round-number transfer of ${tx.amount.toFixed(0)} ${tx.currency}.`,
      });
    }
  }

  const risk_score = Math.min(100, signals.reduce((sum, s) => sum + s.score, 0));
  const is_flagged = risk_score > 50;

  return {
    transaction_id: tx.id,
    risk_score,
    is_flagged,
    signals,
    recommended_action: risk_score > 75 ? "block" : is_flagged ? "review" : "approve",
  };
}
