"use client";

import { useRef, useState } from "react";
import { DEFAULT_MODEL, DEFAULT_OLLAMA_URL } from "@/lib/ollama";
import { SAMPLE_JD, SAMPLE_RESUME_STRONG, SAMPLE_RESUME_PARTIAL } from "@/lib/sampleData";
import type {
  BiasReport,
  QuestionBank as QuestionBankData,
  ScoreResponse,
  ScreeningResult,
} from "@/lib/types";
import { buildMarkdownReport, downloadMarkdown } from "@/lib/exportReport";
import ScoreMeter, { bandColor } from "@/components/ScoreMeter";
import CriterionRow from "@/components/CriterionRow";
import BiasPanel from "@/components/BiasPanel";
import QuestionBank from "@/components/QuestionBank";

// ─── FileField ────────────────────────────────────────────────────────────────

interface FileFieldProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function FileField({ label, file, onChange }: FileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (file) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="font-mono text-xs text-ink-soft truncate">{file.name}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="font-mono text-xs uppercase tracking-wide text-gap hover:underline shrink-0"
        >
          remove
        </button>
      </div>
    );
  }

  return (
    <label className="mt-2 flex items-center gap-1 cursor-pointer group">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
        }}
      />
      <span className="font-mono text-xs text-ink-soft group-hover:text-ink transition-colors">
        or upload {label} as a PDF
      </span>
    </label>
  );
}

// ─── Shared input / card classes ──────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-hairline bg-card px-3 py-2 font-body text-sm text-ink placeholder:text-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--match)] resize-none";

const sampleBtnCls =
  "font-mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink transition-colors";

// ─── Result tabs ──────────────────────────────────────────────────────────────

type ResultTab = "score" | "bias" | "interview";

const TABS: { id: ResultTab; label: string }[] = [
  { id: "score", label: "Score Report" },
  { id: "bias", label: "Bias Check" },
  { id: "interview", label: "Interview Kit" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_URL);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  // Resolved input texts echoed back by /api/score (PDF-extracted or pasted) —
  // context for the bias-check and question-bank calls.
  const [scoredInputs, setScoredInputs] = useState<{
    jobDescription: string;
    resumeText: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<ResultTab>("score");

  const [bias, setBias] = useState<BiasReport | null>(null);
  const [biasLoading, setBiasLoading] = useState(false);
  const [biasError, setBiasError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuestionBankData | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const jdReady = jdFile !== null || jdText.trim().length > 0;
  const resumeReady = resumeFile !== null || resumeText.trim().length > 0;
  const canSubmit = jdReady && resumeReady && !loading;

  async function runBiasCheck(
    report: ScreeningResult,
    inputs: { jobDescription: string; resumeText: string }
  ) {
    setBiasLoading(true);
    setBiasError(null);
    setBias(null);
    try {
      const res = await fetch("/api/bias-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, ...inputs, model, ollamaUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBiasError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setBias(data as BiasReport);
      }
    } catch (err) {
      setBiasError(err instanceof Error ? err.message : String(err));
    } finally {
      setBiasLoading(false);
    }
  }

  async function handleGenerateQuestions() {
    if (!result || !scoredInputs) return;
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: result, ...scoredInputs, model, ollamaUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuestionsError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setQuestions(data as QuestionBankData);
      }
    } catch (err) {
      setQuestionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleScreen() {
    setLoading(true);
    setError(null);
    setResult(null);
    setScoredInputs(null);
    setBias(null);
    setBiasError(null);
    setQuestions(null);
    setQuestionsError(null);
    setActiveTab("score");

    const fd = new FormData();
    if (jdFile) fd.append("jobDescriptionFile", jdFile);
    else fd.append("jobDescriptionText", jdText);
    if (resumeFile) fd.append("resumeFile", resumeFile);
    else fd.append("resumeText", resumeText);
    fd.append("model", model);
    fd.append("ollamaUrl", ollamaUrl);

    try {
      const res = await fetch("/api/score", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        const scored = data as ScoreResponse;
        const { inputs, ...report } = scored;
        setResult(report);
        setScoredInputs(inputs);
        // Bias check runs automatically before the report is trusted.
        void runBiasCheck(report, inputs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!result) return;
    downloadMarkdown(
      buildMarkdownReport(result, bias, questions),
      "screening-report.md"
    );
  }

  return (
    <div className="min-h-screen paper-texture">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft mb-3">
            Screening report · 01
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold italic text-ink mb-3">
            Recruitment Screener
          </h1>
          <p className="text-sm text-ink-soft max-w-prose">
            Paste a job description and a candidate resume to receive an
            AI-powered match assessment across five evaluation dimensions —
            with an automatic bias check and a tailored interview kit.
            Powered by a local Ollama model, so your data never leaves your
            machine.
          </p>
        </header>

        {/* ── Advanced settings ── */}
        <div className="mb-6 flex flex-col items-end gap-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`${sampleBtnCls} flex items-center gap-1`}
          >
            {showAdvanced ? "▲" : "▼"} Model settings
          </button>
          {showAdvanced && (
            <div className="report-card p-5 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
                  Ollama URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className={inputCls.replace("resize-none", "")}
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-1">
                  Model name
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={inputCls.replace("resize-none", "")}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Input cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          {/* Job Description */}
          <div className="report-card p-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Job Description
              </span>
              <button
                type="button"
                className={sampleBtnCls}
                onClick={() => { setJdText(SAMPLE_JD); setJdFile(null); }}
              >
                Load sample
              </button>
            </div>
            <textarea
              rows={10}
              placeholder="Paste job description here…"
              value={jdText}
              onChange={(e) => { setJdText(e.target.value); setJdFile(null); }}
              className={inputCls}
            />
            <FileField
              label="job description"
              file={jdFile}
              onChange={(f) => { setJdFile(f); if (f) setJdText(""); }}
            />
          </div>

          {/* Resume */}
          <div className="report-card p-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Resume
              </span>
              <div className="flex items-baseline gap-3">
                <button
                  type="button"
                  className={sampleBtnCls}
                  onClick={() => { setResumeText(SAMPLE_RESUME_STRONG); setResumeFile(null); }}
                >
                  Sample: strong fit
                </button>
                <button
                  type="button"
                  className={sampleBtnCls}
                  onClick={() => { setResumeText(SAMPLE_RESUME_PARTIAL); setResumeFile(null); }}
                >
                  Sample: partial fit
                </button>
              </div>
            </div>
            <textarea
              rows={10}
              placeholder="Paste resume text here…"
              value={resumeText}
              onChange={(e) => { setResumeText(e.target.value); setResumeFile(null); }}
              className={inputCls}
            />
            <FileField
              label="resume"
              file={resumeFile}
              onChange={(f) => { setResumeFile(f); if (f) setResumeText(""); }}
            />
          </div>
        </div>

        {/* ── Run button ── */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleScreen}
            className="rounded-full bg-ink text-paper font-mono text-sm uppercase tracking-widest px-10 py-3 transition-opacity disabled:opacity-40 hover:opacity-80"
          >
            {loading ? "Scoring…" : "Score candidate"}
          </button>
          {error && (
            <p className="text-sm text-gap text-center max-w-prose">{error}</p>
          )}
        </div>

        {/* ── Results ── */}
        {result && (
          <div>
            {/* Tab bar + export */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-1 rounded-full border border-hairline bg-card p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-mono text-[11px] uppercase tracking-wide px-4 py-1.5 rounded-full transition-colors ${
                      activeTab === tab.id
                        ? "bg-ink text-paper"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    {tab.id === "bias" && bias && bias.flags.length > 0 && (
                      <span
                        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        style={{
                          background:
                            bias.overall_risk === "high"
                              ? "var(--gap)"
                              : "var(--partial)",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExport}
                className={sampleBtnCls}
              >
                ↓ Export full report
              </button>
            </div>

            {/* ── Tab 1: Score Report ── */}
            {activeTab === "score" && (
              <div className="space-y-4">
                {/* Bias banner sits above the score */}
                <BiasPanel report={bias} loading={biasLoading} error={biasError} />

                <div className="report-card paper-texture p-6 sm:p-8">
                  {/* Overall score row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-hairline">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-1">
                        Overall match
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span
                          className="font-display text-6xl font-black leading-none"
                          style={{ color: bandColor(result.overall_score) }}
                        >
                          {result.overall_score}
                        </span>
                        <span className="font-display text-2xl text-ink-soft">/100</span>
                      </div>
                      <p
                        className="font-display text-lg italic mt-1"
                        style={{ color: bandColor(result.overall_score) }}
                      >
                        {result.verdict}
                      </p>
                    </div>
                    <div className="w-full sm:w-64 shrink-0">
                      <ScoreMeter score={result.overall_score} size="lg" />
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="mt-5 text-sm text-ink-soft leading-relaxed">
                    {result.summary}
                  </p>

                  {/* Strengths + Gaps */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-match mb-3">
                        Strengths
                      </p>
                      <ul className="space-y-2">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-ink-soft leading-snug">
                            <span className="text-match font-mono shrink-0">+</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-gap mb-3">
                        Gaps
                      </p>
                      <ul className="space-y-2">
                        {result.gaps.map((g, i) => (
                          <li key={i} className="flex gap-2 text-sm text-ink-soft leading-snug">
                            <span className="text-gap font-mono shrink-0">−</span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Criteria breakdown */}
                  <div className="mt-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-1">
                      Criteria breakdown
                    </p>
                    <div className="mt-3">
                      {result.criteria.map((c) => (
                        <CriterionRow key={c.name} {...c} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab 2: Bias Check ── */}
            {activeTab === "bias" && (
              <div className="report-card paper-texture p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-1">
                  Bias check
                </p>
                <p className="text-sm text-ink-soft mb-5 max-w-prose">
                  A second LLM pass reviews the scoring report for age
                  indicators, gender-coded language, educational prestige
                  bias, name/ethnicity inference, and unfairly penalized
                  career gaps — before you act on the score.
                </p>
                <BiasPanel report={bias} loading={biasLoading} error={biasError} />
                {biasError && (
                  <button
                    type="button"
                    onClick={() => scoredInputs && runBiasCheck(result, scoredInputs)}
                    className={`${sampleBtnCls} mt-3`}
                  >
                    ↻ Retry bias check
                  </button>
                )}
              </div>
            )}

            {/* ── Tab 3: Interview Kit ── */}
            {activeTab === "interview" && (
              <div>
                {!questions && (
                  <div className="report-card paper-texture p-6 sm:p-8 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft mb-2">
                      Interview kit
                    </p>
                    <p className="text-sm text-ink-soft max-w-prose mx-auto mb-6">
                      Generate 12 tailored interview questions — 4 technical
                      questions probing this candidate&apos;s specific skill
                      gaps, 4 STAR-format behavioural questions tied to the
                      role, and 4 culture-fit questions based on the company
                      values in the JD.
                    </p>
                    <button
                      type="button"
                      disabled={questionsLoading}
                      onClick={handleGenerateQuestions}
                      className="rounded-full bg-ink text-paper font-mono text-sm uppercase tracking-widest px-10 py-3 transition-opacity disabled:opacity-40 hover:opacity-80"
                    >
                      {questionsLoading ? "Generating…" : "Generate Interview Kit"}
                    </button>
                    {questionsError && (
                      <p className="text-sm text-gap mt-4 max-w-prose mx-auto">
                        {questionsError}
                      </p>
                    )}
                  </div>
                )}
                {questions && <QuestionBank bank={questions} />}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
