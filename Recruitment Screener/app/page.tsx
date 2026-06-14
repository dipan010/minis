"use client";

import { useRef, useState } from "react";
import { DEFAULT_MODEL, DEFAULT_OLLAMA_URL } from "@/lib/ollama";
import { SAMPLE_JD, SAMPLE_RESUME_STRONG, SAMPLE_RESUME_PARTIAL } from "@/lib/sampleData";
import type { ScreeningResult } from "@/lib/types";
import ScoreMeter, { bandColor } from "@/components/ScoreMeter";
import CriterionRow from "@/components/CriterionRow";

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

  const jdReady = jdFile !== null || jdText.trim().length > 0;
  const resumeReady = resumeFile !== null || resumeText.trim().length > 0;
  const canSubmit = jdReady && resumeReady && !loading;

  async function handleScreen() {
    setLoading(true);
    setError(null);
    setResult(null);

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
        setResult(data as ScreeningResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
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
            powered by a local Ollama model, so your data never leaves your
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
        )}

      </div>
    </div>
  );
}
