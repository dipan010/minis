export interface SalesRecord {
  date: string; // ISO yyyy-mm-dd
  product: string;
  quantity: number;
  revenue: number;
  region?: string;
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  is_anomaly: boolean;
}

export type SeasonPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface SeasonalComponent {
  period: SeasonPeriod;
  strength: number; // 0-1
  peak_periods: string[];
}

export type AnomalySeverity = "mild" | "moderate" | "severe";

export interface AnomalyEvent {
  date: string;
  actual: number;
  expected: number;
  deviation_pct: number;
  severity: AnomalySeverity;
  possible_cause?: string;
}

export interface InventoryRecommendation {
  reorder_point: number;
  safety_stock: number;
  suggested_order_quantity: number;
  stockout_risk: "low" | "medium" | "high";
}

export interface ForecastReport {
  product: string;
  historical_summary: {
    total_records: number;
    date_range: string;
    avg_daily: number;
    trend: "growing" | "stable" | "declining";
    volatility: number; // coefficient of variation
  };
  forecast: ForecastPoint[];
  seasonality: SeasonalComponent[];
  anomalies: AnomalyEvent[];
  insights: string[];
  inventory_recommendations: InventoryRecommendation;
}
