export type Currency = "USD" | "EUR" | "INR" | "BRL";
export type TxCategory = "retail" | "travel" | "food" | "transfer" | "atm" | "online";
export type TxChannel = "pos" | "online" | "atm" | "mobile";
export type SignalType = "velocity" | "amount" | "location" | "pattern" | "time";
export type RecommendedAction = "approve" | "review" | "block";

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: Currency;
  merchant: string;
  category: TxCategory;
  card_last4: string;
  customer_id: string;
  location: { city: string; country: string };
  channel: TxChannel;
}

export interface FraudSignal {
  type: SignalType;
  score: number; // 0-30
  detail: string;
}

export interface FraudResult {
  transaction_id: string;
  risk_score: number; // 0-100
  is_flagged: boolean;
  signals: FraudSignal[];
  explanation: string;
  recommended_action: RecommendedAction;
}

export interface DashboardStats {
  total_processed: number;
  flagged: number;
  blocked: number;
  flag_rate: number; // 0-1
  avg_risk_score: number;
  amount_at_risk: number; // USD-equivalent sum of flagged tx amounts
}

/** SSE event envelope for the /api/simulate stream. */
export type SimEvent =
  | { kind: "transaction"; transaction: Transaction; result: FraudResult }
  | { kind: "stats"; stats: DashboardStats };

export interface CustomerProfile {
  id: string;
  home_city: string;
  home_country: string;
  currency: Currency;
  avg_amount: number;
  usual_categories: TxCategory[];
  /** UTC offset in hours for the customer's home timezone. */
  tz_offset: number;
  risk_tier: "low" | "medium" | "high";
  card_last4: string;
}
