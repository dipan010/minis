import type { CustomerProfile } from "./types";

/** Rough coordinates for impossible-travel checks. */
export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "New York": { lat: 40.7, lon: -74.0 },
  "San Francisco": { lat: 37.8, lon: -122.4 },
  Chicago: { lat: 41.9, lon: -87.6 },
  Austin: { lat: 30.3, lon: -97.7 },
  London: { lat: 51.5, lon: -0.1 },
  Berlin: { lat: 52.5, lon: 13.4 },
  Paris: { lat: 48.9, lon: 2.4 },
  Mumbai: { lat: 19.1, lon: 72.9 },
  Bengaluru: { lat: 13.0, lon: 77.6 },
  Delhi: { lat: 28.6, lon: 77.2 },
  "São Paulo": { lat: -23.6, lon: -46.6 },
  "Rio de Janeiro": { lat: -22.9, lon: -43.2 },
  Lagos: { lat: 6.5, lon: 3.4 },
  Singapore: { lat: 1.35, lon: 103.8 },
  Dubai: { lat: 25.2, lon: 55.3 },
  Moscow: { lat: 55.8, lon: 37.6 },
};

/** 20 simulated customers with distinct spending baselines. All synthetic. */
export const CUSTOMER_PROFILES: CustomerProfile[] = [
  { id: "CUST-001", home_city: "New York", home_country: "US", currency: "USD", avg_amount: 62, usual_categories: ["food", "retail", "online"], tz_offset: -5, risk_tier: "low", card_last4: "4821" },
  { id: "CUST-002", home_city: "San Francisco", home_country: "US", currency: "USD", avg_amount: 118, usual_categories: ["online", "food", "travel"], tz_offset: -8, risk_tier: "low", card_last4: "9034" },
  { id: "CUST-003", home_city: "Chicago", home_country: "US", currency: "USD", avg_amount: 45, usual_categories: ["retail", "food", "atm"], tz_offset: -6, risk_tier: "low", card_last4: "1177" },
  { id: "CUST-004", home_city: "Austin", home_country: "US", currency: "USD", avg_amount: 84, usual_categories: ["online", "retail"], tz_offset: -6, risk_tier: "medium", card_last4: "5560" },
  { id: "CUST-005", home_city: "London", home_country: "GB", currency: "EUR", avg_amount: 71, usual_categories: ["food", "travel", "retail"], tz_offset: 0, risk_tier: "low", card_last4: "2308" },
  { id: "CUST-006", home_city: "Berlin", home_country: "DE", currency: "EUR", avg_amount: 53, usual_categories: ["food", "retail"], tz_offset: 1, risk_tier: "low", card_last4: "6642" },
  { id: "CUST-007", home_city: "Paris", home_country: "FR", currency: "EUR", avg_amount: 96, usual_categories: ["retail", "food", "travel"], tz_offset: 1, risk_tier: "medium", card_last4: "8815" },
  { id: "CUST-008", home_city: "Mumbai", home_country: "IN", currency: "INR", avg_amount: 38, usual_categories: ["food", "online", "atm"], tz_offset: 5.5, risk_tier: "low", card_last4: "3390" },
  { id: "CUST-009", home_city: "Bengaluru", home_country: "IN", currency: "INR", avg_amount: 55, usual_categories: ["online", "food"], tz_offset: 5.5, risk_tier: "low", card_last4: "7126" },
  { id: "CUST-010", home_city: "Delhi", home_country: "IN", currency: "INR", avg_amount: 47, usual_categories: ["retail", "atm", "food"], tz_offset: 5.5, risk_tier: "medium", card_last4: "0473" },
  { id: "CUST-011", home_city: "São Paulo", home_country: "BR", currency: "BRL", avg_amount: 42, usual_categories: ["food", "retail", "online"], tz_offset: -3, risk_tier: "low", card_last4: "9958" },
  { id: "CUST-012", home_city: "Rio de Janeiro", home_country: "BR", currency: "BRL", avg_amount: 58, usual_categories: ["food", "travel"], tz_offset: -3, risk_tier: "medium", card_last4: "4404" },
  { id: "CUST-013", home_city: "New York", home_country: "US", currency: "USD", avg_amount: 210, usual_categories: ["travel", "retail", "online"], tz_offset: -5, risk_tier: "medium", card_last4: "1286" },
  { id: "CUST-014", home_city: "San Francisco", home_country: "US", currency: "USD", avg_amount: 330, usual_categories: ["online", "travel"], tz_offset: -8, risk_tier: "high", card_last4: "7731" },
  { id: "CUST-015", home_city: "London", home_country: "GB", currency: "EUR", avg_amount: 150, usual_categories: ["retail", "travel", "transfer"], tz_offset: 0, risk_tier: "medium", card_last4: "5019" },
  { id: "CUST-016", home_city: "Berlin", home_country: "DE", currency: "EUR", avg_amount: 77, usual_categories: ["online", "food"], tz_offset: 1, risk_tier: "low", card_last4: "6263" },
  { id: "CUST-017", home_city: "Mumbai", home_country: "IN", currency: "INR", avg_amount: 120, usual_categories: ["transfer", "online", "retail"], tz_offset: 5.5, risk_tier: "high", card_last4: "8847" },
  { id: "CUST-018", home_city: "Chicago", home_country: "US", currency: "USD", avg_amount: 66, usual_categories: ["food", "atm", "retail"], tz_offset: -6, risk_tier: "low", card_last4: "2951" },
  { id: "CUST-019", home_city: "São Paulo", home_country: "BR", currency: "BRL", avg_amount: 95, usual_categories: ["online", "transfer"], tz_offset: -3, risk_tier: "high", card_last4: "3175" },
  { id: "CUST-020", home_city: "Paris", home_country: "FR", currency: "EUR", avg_amount: 61, usual_categories: ["food", "retail"], tz_offset: 1, risk_tier: "low", card_last4: "0090" },
];

export const PROFILES_BY_ID = new Map(CUSTOMER_PROFILES.map((p) => [p.id, p]));
