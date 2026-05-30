"use client";

import { useState, useRef, useCallback } from "react";
import { MeetingAnalysis, ActionItem } from "@/lib/types";
import { toMarkdown } from "@/lib/export";
import { SAMPLE_TRANSCRIPTS } from "@/lib/samples";

// ─── Priority config ────────────────────────────────────────────────
const PRIORITY_CONFIG = {
    high: { label: "High", dot: "bg-accent", text: "text-accent", border: "border-red-200" },
    medium: { label: "Med", dot: "bg-yellow-500", text: "text-yellow-700", border: "border-yellow-200" },
    low: { label: "Low", dot: "bg-green-500", text: "text-green-700", border: "border-green-200" },
};

const SENTIMENT_CONFIG = {
    positive: { icon: "◎", label: "Positive", color: "text-green-700", bg: "bg-green-50" },
    neutral: { icon: "◉", label: "Neutral", color: "text-muted", bg: "bg-cream" },
    tense: { icon: "◈", label: "Tense", color: "text-accent", bg: "bg-orange-50" },
    mixed: { icon: "◐", label: "Mixed", color: "text-yellow-700", bg: "bg-yellow-50" },
};

// ─── Sub-components ──────────────────────────────────────────────────

function ActionCard({ item, index }: { item: ActionItem; index: number }) {
    const cfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
    return (
        <div
            className={`card-reveal bg-paper border ${cfg.border} rounded-lg p-4 flex flex-col gap-2`}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="font-body font-medium text-ink text-sm leading-snug flex-1">{item.task}</p>
                <span className={`flex items-center gap-1.5 text-xs font-mono font-medium ${cfg.text} shrink-0`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted font-mono mt-1">
                <span>
                    <span className="text-ink/40 mr-1">owner</span>
                    {item.owner}
                </span>
                <span>
                    <span className="text-ink/40 mr-1">due</span>
                    {item.deadline}
                </span>
            </div>
        </div>
    );
}

function Section({
    title,
    count,
    children,
}: {
    title: string;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <h3 className="font-display text-lg tracking-wide text-ink">{title}</h3>
                {count !== undefined && (
                    <span className="text-xs font-mono text-muted bg-cream px-2 py-0.5 rounded-full border border-border">
                        {count}
                    </span>
                )}
                <div className="h-px flex-1 bg-border" />
            </div>
            {children}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function Home() {
    const [transcript, setTranscript] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [streamBuffer, setStreamBuffer] = useState("");
    const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState<"md" | "text" | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const analyze = useCallback(async () => {
        if (!transcript.trim() || status === "loading") return;

        setStatus("loading");
        setStreamBuffer("");
        setAnalysis(null);
        setError("");

        abortRef.current = new AbortController();
        let buffer = "";

        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Unknown error");
            }

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                setStreamBuffer(buffer);
            }

            // Parse the completed JSON
            const cleaned = buffer.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
            const parsed: MeetingAnalysis = JSON.parse(cleaned);
            setAnalysis(parsed);
            setStatus("done");
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") {
                setStatus("idle");
                return;
            }
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setStatus("error");
        }
    }, [transcript, status]);

    const cancel = () => {
        abortRef.current?.abort();
    };

    const loadSample = (idx: number) => {
        setTranscript(SAMPLE_TRANSCRIPTS[idx].text);
        setStatus("idle");
        setAnalysis(null);
        setStreamBuffer("");
        setError("");
    };

    const copyMarkdown = async () => {
        if (!analysis) return;
        await navigator.clipboard.writeText(toMarkdown(analysis));
        setCopied("md");
        setTimeout(() => setCopied(null), 2000);
    };

    const copyText = async () => {
        if (!analysis) return;
        const lines = [
            analysis.title,
            "",
            "SUMMARY",
            analysis.summary,
            "",
            "ACTION ITEMS",
            ...analysis.action_items.map(
                (a) => `• [${a.priority.toUpperCase()}] ${a.task} — ${a.owner} — ${a.deadline}`
            ),
            "",
            "DECISIONS",
            ...analysis.decisions.map((d) => `• ${d.text}`),
            "",
            "KEY POINTS",
            ...analysis.key_points.map((k) => `• ${k}`),
        ];
        await navigator.clipboard.writeText(lines.join("\n"));
        setCopied("text");
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadMarkdown = () => {
        if (!analysis) return;
        const md = toMarkdown(analysis);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${analysis.title.replace(/\s+/g, "-").toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-paper">
            {/* ── Header ── */}
            <header className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-display text-2xl tracking-widest text-ink">MEETINGMIND</span>
                        <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted bg-cream border border-border px-2 py-1 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            llama3.1:8b · Ollama
                        </span>
                    </div>
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-muted hover:text-ink transition-colors border border-border rounded px-3 py-1.5 bg-cream hover:bg-cream/80"
                    >
                        GitHub ↗
                    </a>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
                {/* ── Hero ── */}
                <div className="flex flex-col gap-2">
                    <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ink leading-none">
                        PASTE TRANSCRIPT.
                        <br />
                        <span className="text-accent">GET CLARITY.</span>
                    </h1>
                    <p className="text-muted font-body text-base max-w-xl mt-2">
                        Drop in any meeting transcript — Zoom, Google Meet, Teams, whatever. Get structured action items, decisions, and a summary in seconds. Runs 100% locally via Ollama.
                    </p>
                </div>

                {/* ── Input area ── */}
                <div className="flex flex-col gap-4">
                    {/* Sample buttons */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-mono text-muted">Try a sample:</span>
                        {SAMPLE_TRANSCRIPTS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => loadSample(i)}
                                className="text-xs font-mono text-muted border border-border rounded px-2.5 py-1 hover:border-ink hover:text-ink transition-colors bg-cream"
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder={`Paste your meeting transcript here...\n\nExample:\n[10:02 AM] Sarah: Let's kick off the sprint planning...\n[10:03 AM] Marcus: I want to flag that the auth service refactor is blocking us...`}
                            className="w-full h-64 bg-white border border-border rounded-xl p-5 font-mono text-sm text-ink placeholder:text-muted/50 resize-none focus:border-ink transition-colors leading-relaxed"
                        />
                        {transcript && (
                            <button
                                onClick={() => setTranscript("")}
                                className="absolute top-3 right-3 text-muted hover:text-ink text-xs font-mono transition-colors"
                            >
                                clear ✕
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={status === "loading" ? cancel : analyze}
                            disabled={!transcript.trim() && status !== "loading"}
                            className={`px-8 py-3 rounded-lg font-display tracking-widest text-sm transition-all ${status === "loading"
                                    ? "bg-ink text-paper hover:bg-ink/80 cursor-pointer"
                                    : "bg-accent text-paper hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
                                }`}
                        >
                            {status === "loading" ? "◼ STOP" : "ANALYSE MEETING →"}
                        </button>

                        {transcript && (
                            <span className="text-xs font-mono text-muted">
                                {transcript.split(/\s+/).filter(Boolean).length} words
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Loading / streaming state ── */}
                {status === "loading" && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse2" />
                            <span className="text-xs font-mono text-muted">llama3.1:8b is thinking...</span>
                        </div>
                        {streamBuffer && (
                            <div className="bg-ink/5 border border-border rounded-xl p-4 max-h-40 overflow-auto">
                                <pre
                                    className={`text-xs font-mono text-muted whitespace-pre-wrap break-words ${!analysis ? "cursor-blink" : ""
                                        }`}
                                >
                                    {streamBuffer}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Error state ── */}
                {status === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col gap-2">
                        <p className="font-display tracking-wide text-accent text-sm">ERROR</p>
                        <p className="font-mono text-xs text-accent/80">{error}</p>
                        <p className="font-mono text-xs text-muted mt-1">
                            Make sure Ollama is running: <code className="bg-cream px-1 rounded">ollama serve</code> and you have pulled the model:{" "}
                            <code className="bg-cream px-1 rounded">ollama pull llama3.1:8b</code>
                        </p>
                    </div>
                )}

                {/* ── Results ── */}
                {status === "done" && analysis && (
                    <div className="flex flex-col gap-8 animate-fade-up">
                        {/* Export toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="font-display text-2xl tracking-wider text-ink">{analysis.title}</h2>
                                <div className="flex items-center gap-3">
                                    {analysis.participants.length > 0 && (
                                        <span className="text-xs font-mono text-muted">
                                            {analysis.participants.join(" · ")}
                                        </span>
                                    )}
                                    {(() => {
                                        const s = SENTIMENT_CONFIG[analysis.sentiment] ?? SENTIMENT_CONFIG.neutral;
                                        return (
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-xs font-mono ${s.color} ${s.bg} px-2 py-0.5 rounded-full border border-current/20`}
                                            >
                                                {s.icon} {s.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyText}
                                    className="text-xs font-mono border border-border rounded px-3 py-1.5 hover:border-ink hover:text-ink transition-colors text-muted bg-cream"
                                >
                                    {copied === "text" ? "✓ Copied" : "Copy text"}
                                </button>
                                <button
                                    onClick={copyMarkdown}
                                    className="text-xs font-mono border border-border rounded px-3 py-1.5 hover:border-ink hover:text-ink transition-colors text-muted bg-cream"
                                >
                                    {copied === "md" ? "✓ Copied" : "Copy .md"}
                                </button>
                                <button
                                    onClick={downloadMarkdown}
                                    className="text-xs font-mono bg-ink text-paper rounded px-3 py-1.5 hover:bg-ink/80 transition-colors"
                                >
                                    ↓ Download .md
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <Section title="SUMMARY">
                            <p className="text-ink/80 font-body text-sm leading-relaxed max-w-3xl bg-white border border-border rounded-xl p-5">
                                {analysis.summary}
                            </p>
                        </Section>

                        {/* Action Items */}
                        {analysis.action_items.length > 0 && (
                            <Section title="ACTION ITEMS" count={analysis.action_items.length}>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {analysis.action_items.map((item, i) => (
                                        <ActionCard key={item.id} item={item} index={i} />
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Decisions */}
                        {analysis.decisions.length > 0 && (
                            <Section title="DECISIONS" count={analysis.decisions.length}>
                                <div className="flex flex-col gap-2">
                                    {analysis.decisions.map((d, i) => (
                                        <div
                                            key={d.id}
                                            className="card-reveal flex items-start gap-3 bg-white border border-border rounded-lg p-4"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <span className="text-accent font-mono text-xs mt-0.5 shrink-0">
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                            <p className="text-ink font-body text-sm leading-snug">{d.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Key Points */}
                        {analysis.key_points.length > 0 && (
                            <Section title="KEY POINTS" count={analysis.key_points.length}>
                                <ul className="flex flex-col gap-2">
                                    {analysis.key_points.map((kp, i) => (
                                        <li
                                            key={i}
                                            className="card-reveal flex items-start gap-3 text-sm text-ink/80 font-body"
                                            style={{ animationDelay: `${i * 40}ms` }}
                                        >
                                            <span className="text-accent mt-1 text-xs shrink-0">◆</span>
                                            {kp}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {/* Analyse another */}
                        <div className="pt-4 border-t border-border">
                            <button
                                onClick={() => {
                                    setStatus("idle");
                                    setAnalysis(null);
                                    setTranscript("");
                                    setStreamBuffer("");
                                }}
                                className="text-xs font-mono text-muted hover:text-ink transition-colors"
                            >
                                ← Analyse another transcript
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-border mt-20 py-6">
                <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted">
                    <span>MEETINGMIND · Week 3 Portfolio Project · Inspired by MERGE &amp; BBVA</span>
                    <span>llama3.1:8b via Ollama · runs 100% locally · no data leaves your machine</span>
                </div>
            </footer>
        </div>
    );
}