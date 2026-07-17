export interface DocumentInput {
  title: string;
  content: string;
  type: "policy" | "regulation";
}

export type Criticality = "mandatory" | "recommended" | "optional";

export interface Requirement {
  id: string;
  section: string;
  text: string;
  category: string;
  criticality: Criticality;
}

export type ComplianceStatus = "compliant" | "partial" | "gap" | "not_applicable";

export interface ComplianceResult {
  requirement_id: string;
  status: ComplianceStatus;
  confidence: number; // 0-100
  policy_reference: string;
  detail: string;
  remediation?: string;
}

export interface GapAnalysis {
  policy_title: string;
  regulation_title: string;
  overall_score: number; // 0-100
  status_summary: {
    compliant: number;
    partial: number;
    gap: number;
    not_applicable: number;
  };
  requirements: Requirement[];
  results: ComplianceResult[];
  priority_gaps: ComplianceResult[];
  executive_summary: string;
  recommendations: string[];
  generated_at: string;
}

export const STATUS_META: Record<ComplianceStatus, { label: string; color: string }> = {
  compliant: { label: "Compliant", color: "var(--compliant)" },
  partial: { label: "Partial", color: "var(--partial)" },
  gap: { label: "Gap", color: "var(--gap)" },
  not_applicable: { label: "N/A", color: "var(--na)" },
};

export const CRITICALITY_ORDER: Record<Criticality, number> = {
  mandatory: 0,
  recommended: 1,
  optional: 2,
};
