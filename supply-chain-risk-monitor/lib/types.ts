export interface CompanyInput {
  name: string;
  industry?: string;
  region?: string;
}

export type RiskCategory =
  | "environmental"
  | "social"
  | "governance"
  | "geopolitical"
  | "operational"
  | "regulatory";

export const RISK_CATEGORIES: RiskCategory[] = [
  "environmental",
  "social",
  "governance",
  "geopolitical",
  "operational",
  "regulatory",
];

export interface RiskEvent {
  id: string;
  date: string; // ISO date
  title: string;
  summary: string;
  category: RiskCategory;
  severity: number; // 1-5
  source: string;
  affected_suppliers?: string[];
}

export interface ESGScore {
  environmental: number; // 0-100
  social: number;
  governance: number;
  overall: number;
}

export type RiskTrend = "improving" | "stable" | "deteriorating";

export interface SupplyChainReport {
  company: string;
  esg: ESGScore;
  risk_events: RiskEvent[];
  top_risks: string[];
  recommendations: string[];
  risk_trend: RiskTrend;
  confidence: number; // 0-100
}

export const CATEGORY_COLORS: Record<RiskCategory, string> = {
  environmental: "#178A50",
  social: "#B07A10",
  governance: "#6D28D9",
  geopolitical: "#BF3128",
  operational: "#0E7490",
  regulatory: "#1D4ED8",
};

export const INDUSTRIES = [
  "Electronics",
  "Agriculture",
  "Manufacturing",
  "Apparel",
  "Automotive",
  "Pharmaceuticals",
  "Energy",
  "Retail",
] as const;

export const REGIONS = [
  "Global",
  "North America",
  "Europe",
  "East Asia",
  "South Asia",
  "Southeast Asia",
  "Latin America",
  "Africa",
] as const;
