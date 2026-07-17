import type { DeliveryInput } from "./types";

export interface SampleScenario {
  name: string;
  description: string;
  input: DeliveryInput;
}

/** Five demo scenarios spanning the confidence spectrum. The comments note
 * the score band each is designed to land in — actual scores vary since
 * the LLM does the judging. */
export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    // designed to land 90+
    name: "Safe suburban",
    description: "Residential, light package, strong history",
    input: {
      address: {
        street: "148 Maplewood Drive",
        city: "Naperville",
        state: "IL",
        zip: "60540",
        country: "United States",
        type: "residential",
      },
      order: {
        weight_kg: 1.2,
        value_usd: 45,
        carrier: "UPS",
        service_level: "standard",
        requires_signature: false,
        fragile: false,
        delivery_window: { start: "2026-07-20", end: "2026-07-23" },
      },
      history: { previous_deliveries: 14, successful: 14, avg_attempts: 1.0 },
    },
  },
  {
    // designed to land 55-65
    name: "Risky urban apartment",
    description: "No doorman, high value, no signature",
    input: {
      address: {
        street: "2201 S State St Apt 4C",
        city: "Chicago",
        state: "IL",
        zip: "60616",
        country: "United States",
        type: "residential",
      },
      order: {
        weight_kg: 0.8,
        value_usd: 1150,
        carrier: "FedEx",
        service_level: "standard",
        requires_signature: false,
        fragile: false,
        delivery_window: { start: "2026-07-18", end: "2026-07-19" },
      },
      history: { previous_deliveries: 6, successful: 4, avg_attempts: 1.7 },
    },
  },
  {
    // designed to land 40-55
    name: "Rural express",
    description: "Long distance, tight window",
    input: {
      address: {
        street: "31 County Road 114",
        city: "Wisdom",
        state: "MT",
        zip: "59761",
        country: "United States",
        type: "residential",
      },
      order: {
        weight_kg: 4.5,
        value_usd: 320,
        carrier: "FedEx",
        service_level: "express",
        requires_signature: true,
        fragile: false,
        delivery_window: { start: "2026-07-16", end: "2026-07-16" },
      },
    },
  },
  {
    // designed to land 85+
    name: "Commercial reliable",
    description: "Office building, signature, good history",
    input: {
      address: {
        street: "500 Congress Ave Floor 12",
        city: "Austin",
        state: "TX",
        zip: "78701",
        country: "United States",
        type: "commercial",
      },
      order: {
        weight_kg: 6.0,
        value_usd: 480,
        carrier: "UPS",
        service_level: "express",
        requires_signature: true,
        fragile: false,
        delivery_window: { start: "2026-07-17", end: "2026-07-18" },
      },
      history: { previous_deliveries: 32, successful: 31, avg_attempts: 1.1 },
    },
  },
  {
    // designed to land 30-45
    name: "PO Box fragile",
    description: "PO box, fragile, high value",
    input: {
      address: {
        street: "PO Box 887",
        city: "Flagstaff",
        state: "AZ",
        zip: "86002",
        country: "United States",
        type: "po_box",
      },
      order: {
        weight_kg: 12.5,
        value_usd: 899,
        carrier: "USPS",
        service_level: "standard",
        requires_signature: false,
        fragile: true,
        delivery_window: { start: "2026-07-21", end: "2026-07-24" },
      },
      history: { previous_deliveries: 2, successful: 1, avg_attempts: 2.0 },
    },
  },
];
