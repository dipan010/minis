"use client";

import { useState } from "react";
import type { PatientContext, ScribeResult } from "@/lib/types";
import { SAMPLE_TRANSCRIPTS } from "@/lib/sampleTranscripts";
import SOAPSection from "@/components/SOAPSection";
import ICD10Table from "@/components/ICD10Table";
import MedicationTable from "@/components/MedicationTable";
import QualityFlags from "@/components/QualityFlag";

const DISCLAIMER =
  "⚕️ AI-Generated Clinical Note — Must be reviewed and approved by a licensed clinician before use in medical records. ICD-10 codes are suggestions only.";

function noteToMarkdown(result: ScribeResult): string {
  const { soap } = result;
  const lines: string[] = [];
  lines.push("# SOAP Note (AI-generated draft)");
  lines.push("");
  lines.push(`> ${DISCLAIMER}`);
  lines.push("");
  lines.push("## Subjective");
  lines.push("");
  lines.push(`**Chief complaint:** ${soap.subjective.chief_complaint}`);
  lines.push("");
  lines.push(`**HPI:** ${soap.subjective.history_present_illness}`);
  lines.push("");
  if (soap.subjective.review_of_systems.length) {
    lines.push("**Review of systems:**");
    soap.subjective.review_of_systems.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }
  if (soap.subjective.patient_reported_symptoms.length) {
    lines.push(`**Reported symptoms:** ${soap.subjective.patient_reported_symptoms.join(", ")}`);
    lines.push("");
  }
  lines.push("## Objective");
  lines.push("");
  if (soap.objective.vitals_mentioned.length) {
    lines.push("| Vital | Value |");
    lines.push("|---|---|");
    soap.objective.vitals_mentioned.forEach((v) => lines.push(`| ${v.type} | ${v.value} |`));
  } else {
    lines.push("_No vitals mentioned._");
  }
  lines.push("");
  if (soap.objective.exam_findings.length) {
    lines.push("**Exam findings:**");
    soap.objective.exam_findings.forEach((f) => lines.push(`- ${f}`));
    lines.push("");
  }
  if (soap.objective.lab_results_mentioned.length) {
    lines.push("**Labs mentioned:**");
    soap.objective.lab_results_mentioned.forEach((l) => lines.push(`- ${l}`));
    lines.push("");
  }
  lines.push("## Assessment");
  lines.push("");
  lines.push(`**Primary diagnosis:** ${soap.assessment.primary_diagnosis}`);
  lines.push("");
  if (soap.assessment.differential_diagnoses.length) {
    lines.push("**Differentials:**");
    soap.assessment.differential_diagnoses.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    lines.push("");
  }
  lines.push("**ICD-10 suggestions (AI — verify):**");
  lines.push("");
  lines.push("| Code | Description | Confidence |");
  lines.push("|---|---|---:|");
  soap.assessment.icd10_suggestions.forEach((c) =>
    lines.push(`| ${c.code} | ${c.description} | ${c.confidence}% |`)
  );
  lines.push("");
  lines.push(`**Clinical reasoning:** ${soap.assessment.clinical_reasoning}`);
  lines.push("");
  lines.push("## Plan");
  lines.push("");
  if (soap.plan.treatment.length) {
    soap.plan.treatment.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
  }
  if (soap.plan.medications.length) {
    lines.push("| Medication | Dosage | Frequency | Duration |");
    lines.push("|---|---|---|---|");
    soap.plan.medications.forEach((m) =>
      lines.push(`| ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration} |`)
    );
    lines.push("");
  }
  lines.push(`**Follow-up:** ${soap.plan.follow_up.timeframe} — ${soap.plan.follow_up.reason}`);
  lines.push("");
  if (soap.plan.referrals.length) {
    lines.push(`**Referrals:** ${soap.plan.referrals.join("; ")}`);
    lines.push("");
  }
  if (soap.plan.patient_education.length) {
    lines.push("**Patient education:**");
    soap.plan.patient_education.forEach((p) => lines.push(`- [ ] ${p}`));
    lines.push("");
  }
  if (result.quality_flags.length) {
    lines.push("## Quality flags");
    lines.push("");
    result.quality_flags.forEach((f) =>
      lines.push(`- **${f.type}** (${f.section}): ${f.message}`)
    );
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(
    `_Summary: ${result.summary} (transcript ${result.word_count.transcript} words → note ${result.word_count.note} words)_`
  );
  lines.push("");
  return lines.join("\n");
}

function TagInput({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-soft mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
        value={draft}
        placeholder="type + Enter to add"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            onChange([...tags, draft.trim()]);
            setDraft("");
          }
        }}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-line/60 px-2.5 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScribeResult | null>(null);
  const [copied, setCopied] = useState(false);

  function loadSample(index: number) {
    const sample = SAMPLE_TRANSCRIPTS[index];
    setTranscript(sample.transcript);
    setError(null);
    const ctx = sample.patient_context;
    setShowContext(Boolean(ctx));
    setAge(ctx?.age != null ? String(ctx.age) : "");
    setSex(ctx?.sex ?? "");
    setConditions(ctx?.known_conditions ?? []);
    setMedications(ctx?.current_medications ?? []);
  }

  function buildContext(): PatientContext | undefined {
    if (!showContext) return undefined;
    const ctx: PatientContext = {};
    if (age.trim()) ctx.age = Number(age);
    if (sex.trim()) ctx.sex = sex.trim();
    if (conditions.length) ctx.known_conditions = conditions;
    if (medications.length) ctx.current_medications = medications;
    return Object.keys(ctx).length ? ctx : undefined;
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, patient_context: buildContext() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setResult(data as ScribeResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(noteToMarkdown(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleExport() {
    if (!result) return;
    const blob = new Blob([noteToMarkdown(result)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soap-note.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const soap = result?.soap;

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <h1 className="text-lg font-semibold">Clinical Note Scribe</h1>
          <p className="text-[13px] text-ink-soft">
            Doctor-patient transcript → structured SOAP note with ICD-10
            suggestions. Local Ollama inference. Demonstration only — not a
            medical device.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6 items-start">

        {/* ── LEFT: input ── */}
        <div className="panel p-5 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
              Sample transcripts
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SAMPLE_TRANSCRIPTS.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  title={s.description}
                  onClick={() => loadSample(i)}
                  className="rounded-md border border-line px-2.5 py-1.5 text-[12px] text-left hover:border-ink transition-colors"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft mb-1">
              Transcript
            </label>
            <textarea
              className="w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:border-ink resize-y"
              style={{ minHeight: 260 }}
              placeholder={"Doctor: ...\nPatient: ..."}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <div className="border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
            >
              {showContext ? "▲" : "▼"} Patient context (optional)
            </button>
            {showContext && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-ink-soft mb-1">Age</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-md border border-line px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-ink-soft mb-1">Sex</label>
                    <input
                      className="w-full rounded-md border border-line px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                    />
                  </div>
                </div>
                <TagInput label="Known conditions" tags={conditions} onChange={setConditions} />
                <TagInput label="Current medications" tags={medications} onChange={setMedications} />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={transcript.trim().length < 100 || loading}
            onClick={handleGenerate}
            className="w-full rounded-md bg-ink text-card text-sm font-medium py-2.5 transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {loading ? "Generating SOAP note…" : "Generate SOAP Note"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        {/* ── RIGHT: SOAP output ── */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="panel p-12 text-center">
              <p className="text-sm text-ink-soft">
                Load a sample or paste a transcript, then generate. The SOAP
                note renders here.
              </p>
            </div>
          )}

          {loading && (
            <div className="panel p-12 flex items-center justify-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-ink border-t-transparent animate-spin" />
              <p className="text-sm text-ink-soft">Structuring the encounter…</p>
            </div>
          )}

          {result && soap && (
            <>
              {/* Disclaimer */}
              <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-blue-900 leading-snug flex-1 min-w-64">
                  {DISCLAIMER}
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100 transition-colors"
                  >
                    {copied ? "Copied ✓" : "Copy to Clipboard"}
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-100 transition-colors"
                  >
                    Export as Markdown
                  </button>
                </div>
              </div>

              <QualityFlags flags={result.quality_flags} />

              {/* S */}
              <SOAPSection letter="S" title="Subjective" color="#2563EB">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">
                    Chief complaint
                  </p>
                  <p className="text-sm font-semibold">{soap.subjective.chief_complaint}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">
                    History of present illness
                  </p>
                  <p className="text-sm leading-relaxed">{soap.subjective.history_present_illness}</p>
                </div>
                {soap.subjective.review_of_systems.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Review of systems
                    </p>
                    <ul className="text-sm text-ink-soft space-y-0.5 columns-1 sm:columns-2">
                      {soap.subjective.review_of_systems.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {soap.subjective.patient_reported_symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {soap.subjective.patient_reported_symptoms.map((symptom, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-0.5 text-xs"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                )}
              </SOAPSection>

              {/* O */}
              <SOAPSection letter="O" title="Objective" color="#16A34A">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                    Vitals mentioned
                  </p>
                  {soap.objective.vitals_mentioned.length === 0 ? (
                    <p className="text-sm text-ink-soft italic">None mentioned in transcript.</p>
                  ) : (
                    <table className="w-auto">
                      <tbody>
                        {soap.objective.vitals_mentioned.map((v, i) => (
                          <tr key={i} className="border-b border-line/60 last:border-b-0">
                            <td className="py-1 pr-6 text-sm text-ink-soft">{v.type}</td>
                            <td className="py-1 font-mono text-sm font-medium">{v.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {soap.objective.exam_findings.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Exam findings
                    </p>
                    <ul className="text-sm space-y-0.5">
                      {soap.objective.exam_findings.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {soap.objective.lab_results_mentioned.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Labs mentioned
                    </p>
                    <ul className="text-sm space-y-0.5">
                      {soap.objective.lab_results_mentioned.map((l, i) => (
                        <li key={i}>• {l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SOAPSection>

              {/* A */}
              <SOAPSection letter="A" title="Assessment" color="#D97706">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">
                    Primary diagnosis
                  </p>
                  <p className="text-base font-semibold">{soap.assessment.primary_diagnosis}</p>
                </div>
                {soap.assessment.differential_diagnoses.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Differential diagnoses
                    </p>
                    <ol className="text-sm list-decimal ml-5 space-y-0.5">
                      {soap.assessment.differential_diagnoses.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                    ICD-10 suggestions (AI — verify before coding)
                  </p>
                  <ICD10Table suggestions={soap.assessment.icd10_suggestions} />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-0.5">
                    Clinical reasoning
                  </p>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {soap.assessment.clinical_reasoning}
                  </p>
                </div>
              </SOAPSection>

              {/* P */}
              <SOAPSection letter="P" title="Plan" color="#7C3AED">
                {soap.plan.treatment.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Treatment
                    </p>
                    <ol className="text-sm list-decimal ml-5 space-y-0.5">
                      {soap.plan.treatment.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                    Medications
                  </p>
                  <MedicationTable medications={soap.plan.medications} />
                </div>
                <div className="rounded-md bg-purple-50 border border-purple-200 px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-purple-700 mb-0.5">
                    Follow-up
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{soap.plan.follow_up.timeframe || "Not specified"}</span>
                    {soap.plan.follow_up.reason && (
                      <span className="text-ink-soft"> — {soap.plan.follow_up.reason}</span>
                    )}
                  </p>
                </div>
                {soap.plan.referrals.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Referrals
                    </p>
                    <ul className="text-sm space-y-0.5">
                      {soap.plan.referrals.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {soap.plan.patient_education.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                      Patient education
                    </p>
                    <ul className="text-sm space-y-1">
                      {soap.plan.patient_education.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <input type="checkbox" className="mt-1 accent-[#7C3AED]" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </SOAPSection>

              {/* Summary card */}
              <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-ink-soft flex-1 min-w-64">{result.summary}</p>
                <p className="font-mono text-[11px] text-ink-soft shrink-0">
                  transcript {result.word_count.transcript}w → note {result.word_count.note}w
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
