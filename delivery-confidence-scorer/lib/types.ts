export type AddressType = "residential" | "commercial" | "po_box";
export type ServiceLevel = "standard" | "express" | "overnight";
export type RiskCategory = "address" | "weather" | "package" | "timing" | "history";
export type Severity = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DeliveryInput {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    type: AddressType;
  };
  order: {
    weight_kg: number;
    value_usd: number;
    carrier: string;
    service_level: ServiceLevel;
    requires_signature: boolean;
    fragile: boolean;
    delivery_window: { start: string; end: string };
  };
  history?: {
    previous_deliveries: number;
    successful: number;
    avg_attempts: number;
  };
}

export interface RiskFactor {
  category: RiskCategory;
  severity: Severity;
  detail: string;
  mitigation: string;
}

export interface DeliveryScore {
  confidence: number; // 0-100
  risk_level: RiskLevel;
  risk_factors: RiskFactor[];
  recommendations: string[];
  estimated_attempts: number;
  suggested_actions: string[];
}

export const CARRIERS = ["UPS", "FedEx", "USPS", "DHL", "Regional carrier"] as const;

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "India",
  "Australia",
] as const;
