"use client";

import { useCallback, useRef, useState } from "react";
import type { ExtractionResult, FieldSpec, TaxFormType } from "@/lib/types";
import { FIELD_CATEGORIES, FORM_SCHEMAS, FORM_TYPE_LABELS } from "@/lib/types";
import { SAMPLE_IMAGES, SAMPLE_RESULTS } from "@/lib/sampleData";
import FieldRow from "@/components/FieldRow";

type SampleKey = keyof typeof SAMPLE_RESULTS;

const SAMPLE_BUTTONS: { key: SampleKey; label: string }[] = [
  { key: "W2", label: "Sample W-2" },
  { key: "1099_NEC", label: "Sample 1099" },
  { key: "FORM_16", label: "Sample Form 16" },
];

export default function Home() {
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    setPreviewImage(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setResult(data as ExtractionResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  function loadSample(key: SampleKey) {
    setError(null);
    setLoading(false);
    setFileName(`sample-${key.toLowerCase()}.png`);
    setPreviewImage(SAMPLE_IMAGES[key]);
    // Deep-copy so edits to the form never mutate the sample constants.
    setResult(JSON.parse(JSON.stringify(SAMPLE_RESULTS[key])) as ExtractionResult);
  }

  function updateField(fieldName: string, value: string) {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((f) =>
              f.fieldName === fieldName ? { ...f, value } : f
            ),
          }
        : prev
    );
  }

  function exportJson() {
    if (!result) return;
    const payload = {
      form_type: result.formType,
      form_label: FORM_TYPE_LABELS[result.formType],
      exported_at: new Date().toISOString(),
      fields: Object.fromEntries(
        result.fields.map((f) => [f.fieldName, { value: f.value, confidence: f.confidence }])
      ),
      warnings: result.warnings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.formType.toLowerCase()}-extraction.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function fieldsForCategory(formType: TaxFormType, category: FieldSpec["category"]) {
    if (!result) return [];
    return FORM_SCHEMAS[formType]
      .filter((spec) => spec.category === category)
      .map((spec) => ({
        spec,
        field: result.fields.find((f) => f.fieldName === spec.key) ?? {
          fieldName: spec.key,
          value: "",
          confidence: 0,
        },
      }));
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              AI Tax Form Extractor
            </h1>
            <p className="text-[13px] text-ink-soft">
              W-2 · 1099-NEC · 1099-INT · Form 16 — local Ollama extraction, nothing leaves your machine
            </p>
          </div>
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-wide text-ink-soft border border-line rounded-full px-3 py-1">
            demo — not for tax filing
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6 items-start">

        {/* ── LEFT: upload + samples ── */}
        <div className="space-y-4">
          <div
            className={`panel p-6 border-2 border-dashed transition-colors cursor-pointer ${
              dragActive ? "border-accent bg-accent-soft" : "border-line"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <div className="text-center py-6">
              <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-accent-soft text-accent flex items-center justify-center text-lg">
                ↑
              </div>
              <p className="text-sm font-medium text-ink">
                Drop a tax form here, or click to browse
              </p>
              <p className="text-xs text-ink-soft mt-1">
                Images (PNG/JPG) go through llava:13b OCR · PDFs are parsed directly
              </p>
            </div>
          </div>

          <div className="panel p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-3">
              Try a sample (no Ollama needed)
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_BUTTONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => loadSample(s.key)}
                  className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {previewImage && (
            <div className="panel p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                Document preview {fileName && <span className="normal-case">— {fileName}</span>}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Uploaded tax form preview"
                className="w-full rounded-md border border-line"
              />
            </div>
          )}
        </div>

        {/* ── RIGHT: results ── */}
        <div className="space-y-4">
          {loading && (
            <div className="panel p-8 flex items-center gap-4">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <div>
                <p className="text-sm font-medium text-ink">Extracting fields…</p>
                <p className="text-xs text-ink-soft">
                  Vision OCR can take a few minutes on CPU. The request times out after 5 minutes.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="panel p-4 border-bad/40" style={{ borderLeftWidth: 3, borderLeftColor: "var(--bad)" }}>
              <p className="text-sm text-bad">{error}</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="panel p-10 text-center">
              <p className="text-sm text-ink-soft">
                Upload a form or load a sample to see extracted fields here.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Form type + actions */}
              <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    Detected form type
                  </p>
                  <p className="text-sm font-semibold text-accent">
                    {FORM_TYPE_LABELS[result.formType]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRawText((v) => !v)}
                    className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink transition-colors"
                  >
                    {showRawText ? "Hide raw text" : "Raw text"}
                  </button>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-md bg-accent text-white px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div
                  className="panel p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: "var(--warn)" }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-wide text-warn mb-2">
                    Warnings
                  </p>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-[13px] text-ink-soft leading-snug flex gap-2">
                        <span className="text-warn shrink-0">⚠</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showRawText && (
                <div className="panel p-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                    Raw extracted text
                  </p>
                  <pre className="font-mono text-xs text-ink-soft whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {result.rawText}
                  </pre>
                </div>
              )}

              {/* Editable fields grouped by category */}
              {FIELD_CATEGORIES.map((category) => {
                const rows = fieldsForCategory(result.formType, category);
                if (rows.length === 0) return null;
                return (
                  <section key={category} className="panel p-4">
                    <h2 className="text-sm font-semibold text-ink border-b border-line pb-2 mb-2">
                      {category}
                    </h2>
                    <div className="space-y-1">
                      {rows.map(({ spec, field }) => (
                        <FieldRow
                          key={spec.key}
                          label={spec.label}
                          field={field}
                          onChange={(value) => updateField(spec.key, value)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              <p className="text-[11px] text-ink-soft text-center pb-4">
                Confidence scores are LLM estimates, not statistical guarantees.
                Verify every value against the source document before using it anywhere.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
