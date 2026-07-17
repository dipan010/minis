import type { QualityFlag, ScribeResult, SOAPNote, TranscriptInput } from "./types";
import { callOllamaStructured, type OllamaCallOptions } from "./ollama";

const SOAP_SCHEMA = {
  type: "object",
  properties: {
    subjective: {
      type: "object",
      properties: {
        chief_complaint: { type: "string" },
        history_present_illness: { type: "string" },
        review_of_systems: { type: "array", items: { type: "string" } },
        patient_reported_symptoms: { type: "array", items: { type: "string" } },
      },
      required: [
        "chief_complaint",
        "history_present_illness",
        "review_of_systems",
        "patient_reported_symptoms",
      ],
    },
    objective: {
      type: "object",
      properties: {
        vitals_mentioned: {
          type: "array",
          items: {
            type: "object",
            properties: { type: { type: "string" }, value: { type: "string" } },
            required: ["type", "value"],
          },
        },
        exam_findings: { type: "array", items: { type: "string" } },
        lab_results_mentioned: { type: "array", items: { type: "string" } },
      },
      required: ["vitals_mentioned", "exam_findings", "lab_results_mentioned"],
    },
    assessment: {
      type: "object",
      properties: {
        primary_diagnosis: { type: "string" },
        differential_diagnoses: { type: "array", items: { type: "string" } },
        icd10_suggestions: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              description: { type: "string" },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
            },
            required: ["code", "description", "confidence"],
          },
        },
        clinical_reasoning: { type: "string" },
      },
      required: [
        "primary_diagnosis",
        "differential_diagnoses",
        "icd10_suggestions",
        "clinical_reasoning",
      ],
    },
    plan: {
      type: "object",
      properties: {
        treatment: { type: "array", items: { type: "string" } },
        medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              duration: { type: "string" },
            },
            required: ["name", "dosage", "frequency", "duration"],
          },
        },
        follow_up: {
          type: "object",
          properties: { timeframe: { type: "string" }, reason: { type: "string" } },
          required: ["timeframe", "reason"],
        },
        referrals: { type: "array", items: { type: "string" } },
        patient_education: { type: "array", items: { type: "string" } },
      },
      required: ["treatment", "medications", "follow_up", "referrals", "patient_education"],
    },
    generation_flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["missing_info", "ambiguous", "critical", "inconsistency"],
          },
          message: { type: "string" },
          section: { type: "string" },
        },
        required: ["type", "message", "section"],
      },
    },
    summary: { type: "string" },
  },
  required: ["subjective", "objective", "assessment", "plan", "generation_flags", "summary"],
};

interface RawSoapOutput extends SOAPNote {
  generation_flags: QualityFlag[];
  summary: string;
}

function buildPrompt(input: TranscriptInput): string {
  const ctx = input.patient_context;
  const contextBlock = ctx
    ? `PATIENT CONTEXT (provided separately from the transcript):
- Age: ${ctx.age ?? "not provided"}
- Sex: ${ctx.sex ?? "not provided"}
- Known conditions: ${ctx.known_conditions?.length ? ctx.known_conditions.join(", ") : "none provided"}
- Current medications: ${ctx.current_medications?.length ? ctx.current_medications.join(", ") : "none provided"}
`
    : "PATIENT CONTEXT: none provided.";

  return `You are an experienced medical scribe. Convert the following doctor-patient conversation into a structured SOAP note. Extract all clinical information mentioned. For ICD-10 codes, suggest the most likely codes but flag them as AI-suggested (they must be verified by a clinician). Flag any missing information that would typically be in a complete clinical encounter.

STRICT RULES:
- Extract ONLY what is stated in the transcript or patient context. Never invent vitals, exam findings, lab values, or medication doses that were not said.
- Empty arrays are the correct output when a category was not discussed (e.g. no vitals mentioned).
- subjective.chief_complaint: one short phrase in the patient's terms.
- subjective.history_present_illness: a coherent HPI paragraph (onset, duration, character, aggravating/relieving factors, as available).
- assessment.icd10_suggestions: 1-5 codes with confidence 0-100 reflecting how clearly the transcript supports each code.
- assessment.clinical_reasoning: 2-4 sentences connecting findings to the assessment.
- plan.medications: only medications the clinician actually prescribed or adjusted in this encounter, with dosage/frequency/duration as stated ("as stated: not specified" if missing).
- generation_flags: list gaps a clinician should notice — e.g. "No vitals mentioned in transcript" (missing_info, section Objective), "Allergy status not discussed" (missing_info), ambiguous statements (ambiguous), red-flag symptoms needing urgent attention (critical), or contradictions (inconsistency).
- summary: 2-3 sentences summarizing the encounter.

${contextBlock}

TRANSCRIPT:
"""
${input.transcript}
"""`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function noteWordCount(soap: SOAPNote): number {
  const parts: string[] = [
    soap.subjective.chief_complaint,
    soap.subjective.history_present_illness,
    ...soap.subjective.review_of_systems,
    ...soap.subjective.patient_reported_symptoms,
    ...soap.objective.vitals_mentioned.map((v) => `${v.type} ${v.value}`),
    ...soap.objective.exam_findings,
    ...soap.objective.lab_results_mentioned,
    soap.assessment.primary_diagnosis,
    ...soap.assessment.differential_diagnoses,
    soap.assessment.clinical_reasoning,
    ...soap.plan.treatment,
    ...soap.plan.medications.map((m) => `${m.name} ${m.dosage} ${m.frequency} ${m.duration}`),
    soap.plan.follow_up.timeframe,
    soap.plan.follow_up.reason,
    ...soap.plan.referrals,
    ...soap.plan.patient_education,
  ];
  return countWords(parts.join(" "));
}

/** Post-processing: add deterministic quality flags for thin sections the
 * model may not have flagged itself. */
function deriveFlags(soap: SOAPNote, modelFlags: QualityFlag[]): QualityFlag[] {
  const flags = [...modelFlags];
  const has = (msg: string) => flags.some((f) => f.message.toLowerCase().includes(msg));

  if (soap.objective.vitals_mentioned.length === 0 && !has("vitals")) {
    flags.push({
      type: "missing_info",
      message: "No vitals mentioned in transcript.",
      section: "Objective",
    });
  }
  if (soap.objective.exam_findings.length === 0 && !has("exam")) {
    flags.push({
      type: "missing_info",
      message: "No physical exam findings documented.",
      section: "Objective",
    });
  }
  if (soap.plan.follow_up.timeframe.trim() === "" && !has("follow")) {
    flags.push({
      type: "missing_info",
      message: "No follow-up timeframe specified.",
      section: "Plan",
    });
  }
  return flags;
}

export async function generateSOAP(
  input: TranscriptInput,
  options?: OllamaCallOptions
): Promise<ScribeResult> {
  const raw = await callOllamaStructured<RawSoapOutput>(buildPrompt(input), SOAP_SCHEMA, {
    temperature: 0.1,
    timeoutMs: 120_000,
    ...options,
  });

  const { generation_flags, summary, ...soap } = raw;

  return {
    soap,
    quality_flags: deriveFlags(soap, generation_flags),
    summary,
    word_count: {
      transcript: countWords(input.transcript),
      note: noteWordCount(soap),
    },
  };
}
