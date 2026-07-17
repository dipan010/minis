export interface PatientContext {
  age?: number;
  sex?: string;
  known_conditions?: string[];
  current_medications?: string[];
}

export interface TranscriptInput {
  transcript: string;
  patient_context?: PatientContext;
}

export interface SOAPNote {
  subjective: {
    chief_complaint: string;
    history_present_illness: string;
    review_of_systems: string[];
    patient_reported_symptoms: string[];
  };
  objective: {
    vitals_mentioned: { type: string; value: string }[];
    exam_findings: string[];
    lab_results_mentioned: string[];
  };
  assessment: {
    primary_diagnosis: string;
    differential_diagnoses: string[];
    icd10_suggestions: { code: string; description: string; confidence: number }[];
    clinical_reasoning: string;
  };
  plan: {
    treatment: string[];
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    follow_up: { timeframe: string; reason: string };
    referrals: string[];
    patient_education: string[];
  };
}

export type QualityFlagType = "missing_info" | "ambiguous" | "critical" | "inconsistency";

export interface QualityFlag {
  type: QualityFlagType;
  message: string;
  section: string;
}

export interface ScribeResult {
  soap: SOAPNote;
  quality_flags: QualityFlag[];
  summary: string;
  word_count: { transcript: number; note: number };
}
