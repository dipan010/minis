import { useState, useRef, useEffect } from "react";

const SAMPLE_EMAILS = [
    {
        label: "Frustrated Client",
        text: `From: david.chen@nexuscorp.com
To: support@yourcompany.com
Subject: RE: RE: RE: Still no resolution??

This is absolutely unacceptable. We've been waiting THREE WEEKS for a fix that was supposed to take 48 hours. Our entire team is blocked and my CEO is asking me daily for updates.

I've sent 4 emails with zero meaningful response. Do you even read these? Every time I reach out I get a generic "we're looking into it" reply with no timeline, no owner, nothing actionable.

If this isn't resolved by end of day Friday I'm escalating to your VP and looping in my legal team. This is costing us real money.

David Chen
VP of Operations, NexusCorp`,
    },
    {
        label: "Positive Feedback",
        text: `From: sarah.m@brightdesign.io
To: team@yourcompany.com
Subject: Just wanted to say thank you!

Hi team,

I rarely write emails like this but I felt compelled to reach out after the experience I had with your product this past month.

The onboarding was seamless, the support team was incredibly responsive, and the results have genuinely exceeded our expectations. Our campaign performance is up 34% since switching over.

Maria in customer success deserves a special shoutout — she went above and beyond during our setup phase.

Looking forward to expanding our usage next quarter. Keep up the amazing work!

Warmly,
Sarah M.`,
    },
    {
        label: "Confused / Urgent",
        text: `From: priya.sharma@techflow.co
To: billing@yourcompany.com
Subject: Invoice #4892 - Need clarification ASAP

Hello,

I received invoice #4892 this morning for $4,200 but our agreed contract was for $2,800/month. I'm not sure what the additional charges are for and I need to understand before my finance team processes this by EOD today.

I tried calling but couldn't get through. Can someone explain the breakdown? Specifically lines 4 and 7 seem off.

Is there a mistake? Or were additional services added that I wasn't informed about? I don't want to delay payment but I also can't approve something I don't understand.

Please respond as soon as possible.

Priya Sharma`,
    },
];

const SENTIMENT_META = {
    frustrated: {
        color: "#ef4444",
        bg: "#fef2f2",
        border: "#fecaca",
        icon: "⚡",
        label: "Frustrated",
    },
    positive: {
        color: "#22c55e",
        bg: "#f0fdf4",
        border: "#bbf7d0",
        icon: "✨",
        label: "Positive",
    },
    confused: {
        color: "#f59e0b",
        bg: "#fffbeb",
        border: "#fde68a",
        icon: "❓",
        label: "Confused",
    },
    urgent: {
        color: "#8b5cf6",
        bg: "#faf5ff",
        border: "#ddd6fe",
        icon: "🔔",
        label: "Urgent",
    },
    neutral: {
        color: "#6b7280",
        bg: "#f9fafb",
        border: "#e5e7eb",
        icon: "💬",
        label: "Neutral",
    },
};

const TONE_STYLES = {
    formal: { emoji: "🎩", color: "#1e40af", accent: "#dbeafe" },
    friendly: { emoji: "😊", color: "#065f46", accent: "#d1fae5" },
    brief: { emoji: "⚡", color: "#7c3aed", accent: "#ede9fe" },
};

function GrainOverlay() {
    return (
        <svg
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0.035,
            }}
        >
            <filter id="grain">
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.65"
                    numOctaves="3"
                    stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
    );
}

function ScoreArc({ score, color }) {
    const radius = 42;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (score / 100) * circ;
    return (
        <svg width="120" height="70" viewBox="0 0 120 70" style={{ overflow: "visible" }}>
            <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
                strokeLinecap="round"
            />
            <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 157} 157`}
                style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
            />
            <text
                x="60"
                y="56"
                textAnchor="middle"
                fontSize="22"
                fontWeight="800"
                fill={color}
                fontFamily="'Playfair Display', serif"
            >
                {score}
            </text>
            <text x="60" y="68" textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="monospace">
                CONFIDENCE
            </text>
        </svg>
    );
}

function PulsingDot({ color }) {
    return (
        <span
            style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                animation: "pulse 1.4s ease-in-out infinite",
                marginRight: 6,
            }}
        />
    );
}

export default function App() {
    const [emailText, setEmailText] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
    const [model, setModel] = useState("mistral:7b");
    const [copiedIdx, setCopiedIdx] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [useClaudeApi, setUseClaudeApi] = useState(true);
    const resultsRef = useRef(null);

    async function analyzeWithClaude(emailText) {
        const prompt = `You are an expert email sentiment analyst. Analyze the following email and return ONLY a JSON object (no markdown, no explanation).

Email:
${emailText}

Return this exact JSON structure:
{
  "primary_sentiment": "frustrated|positive|confused|urgent|neutral",
  "secondary_sentiments": ["list", "of", "other", "detected", "sentiments"],
  "confidence": 85,
  "tone_summary": "One sentence describing the overall tone",
  "key_signals": ["signal 1", "signal 2", "signal 3"],
  "intent": "What the sender wants to achieve",
  "risk_level": "low|medium|high",
  "recommended_response_urgency": "within 1 hour|within 4 hours|within 24 hours|within 48 hours",
  "replies": {
    "formal": "A formal, professional reply draft (2-3 paragraphs)",
    "friendly": "A warm, empathetic reply draft (2-3 paragraphs)",
    "brief": "A concise, action-focused reply draft (3-5 sentences)"
  }
}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const text = data.content.map((c) => c.text || "").join("");
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    }

    async function analyzeWithOllama(emailText) {
        const prompt = `You are an expert email sentiment analyst. Analyze the following email and return ONLY a valid JSON object. No markdown fences, no explanation, just JSON.

Email:
${emailText}

Return this exact JSON structure:
{
  "primary_sentiment": "frustrated|positive|confused|urgent|neutral",
  "secondary_sentiments": ["list", "of", "other", "detected", "sentiments"],
  "confidence": 85,
  "tone_summary": "One sentence describing the overall tone",
  "key_signals": ["signal 1", "signal 2", "signal 3"],
  "intent": "What the sender wants to achieve",
  "risk_level": "low|medium|high",
  "recommended_response_urgency": "within 1 hour|within 4 hours|within 24 hours|within 48 hours",
  "replies": {
    "formal": "A formal, professional reply draft (2-3 paragraphs)",
    "friendly": "A warm, empathetic reply draft (2-3 paragraphs)",
    "brief": "A concise, action-focused reply draft (3-5 sentences)"
  }
}`;

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                format: "json",
            }),
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.status}. Is Ollama running at ${ollamaUrl}?`);
        const data = await response.json();
        const text = data.response || "";
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    }

    async function analyze() {
        if (!emailText.trim()) {
            setError("Please paste an email first.");
            return;
        }
        setLoading(true);
        setError("");
        setAnalysis(null);
        try {
            const result = useClaudeApi
                ? await analyzeWithClaude(emailText)
                : await analyzeWithOllama(emailText);
            setAnalysis(result);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        } catch (e) {
            setError(
                useClaudeApi
                    ? `Claude API error: ${e.message}`
                    : `Ollama error: ${e.message}. Make sure Ollama is running locally with 'ollama serve' and you've pulled the model with 'ollama pull ${model}'.`
            );
        } finally {
            setLoading(false);
        }
    }

    function copyReply(text, idx) {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    }

    const meta = analysis ? SENTIMENT_META[analysis.primary_sentiment] || SENTIMENT_META.neutral : null;
    const riskColors = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#0f0e0c",
                fontFamily: "'DM Sans', sans-serif",
                color: "#e8e4dc",
                padding: "0 0 80px",
                position: "relative",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer {
          0%{background-position:-400px 0}
          100%{background-position:400px 0}
        }
        .shimmer {
          background: linear-gradient(90deg, #1a1916 25%, #242220 50%, #1a1916 75%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite;
        }
        textarea:focus { outline: none; border-color: #c9a84c !important; }
        .reply-card:hover { background: #1e1c18 !important; }
        .sample-btn:hover { background: #1e1c18 !important; border-color: #4a4740 !important; }
        .analyze-btn:hover:not(:disabled) { background: #b8943d !important; transform: translateY(-1px); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .config-toggle:hover { background: #1a1916 !important; }
        .copy-btn:hover { background: #2a2820 !important; }
      `}</style>

            <GrainOverlay />

            {/* Header */}
            <div
                style={{
                    borderBottom: "1px solid #1e1c18",
                    padding: "28px 40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                        <h1
                            style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 26,
                                fontWeight: 900,
                                margin: 0,
                                letterSpacing: "-0.5px",
                                color: "#f0ead8",
                            }}
                        >
                            SentimentScope
                        </h1>
                        <span
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 10,
                                color: "#c9a84c",
                                background: "#1e1a10",
                                border: "1px solid #3a3010",
                                padding: "2px 8px",
                                borderRadius: 4,
                                letterSpacing: "0.1em",
                            }}
                        >
                            WEEK 4
                        </span>
                    </div>
                    <p
                        style={{
                            margin: "4px 0 0",
                            color: "#6b6860",
                            fontSize: 13,
                            letterSpacing: "0.01em",
                        }}
                    >
                        Email sentiment analysis + reply generation
                    </p>
                </div>

                <button
                    className="config-toggle"
                    onClick={() => setShowConfig(!showConfig)}
                    style={{
                        background: "transparent",
                        border: "1px solid #2a2820",
                        color: "#8a8680",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: "0.05em",
                        transition: "all .15s",
                    }}
                >
                    ⚙ CONFIG
                </button>
            </div>

            {/* Config panel */}
            {showConfig && (
                <div
                    style={{
                        background: "#141311",
                        border: "1px solid #2a2820",
                        borderRadius: 12,
                        margin: "16px 40px",
                        padding: 24,
                        position: "relative",
                        zIndex: 1,
                        animation: "fadeSlideUp .2s ease",
                    }}
                >
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div>
                            <label style={{ display: "block", fontSize: 11, color: "#8a8680", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
                                BACKEND
                            </label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={() => setUseClaudeApi(true)}
                                    style={{
                                        padding: "7px 14px", borderRadius: 7, border: "1px solid",
                                        borderColor: useClaudeApi ? "#c9a84c" : "#2a2820",
                                        background: useClaudeApi ? "#1e1a10" : "transparent",
                                        color: useClaudeApi ? "#c9a84c" : "#6b6860",
                                        fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                    }}
                                >
                                    Claude API
                                </button>
                                <button
                                    onClick={() => setUseClaudeApi(false)}
                                    style={{
                                        padding: "7px 14px", borderRadius: 7, border: "1px solid",
                                        borderColor: !useClaudeApi ? "#c9a84c" : "#2a2820",
                                        background: !useClaudeApi ? "#1e1a10" : "transparent",
                                        color: !useClaudeApi ? "#c9a84c" : "#6b6860",
                                        fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                    }}
                                >
                                    Ollama (local)
                                </button>
                            </div>
                        </div>
                        {!useClaudeApi && (
                            <>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, color: "#8a8680", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
                                        OLLAMA URL
                                    </label>
                                    <input
                                        value={ollamaUrl}
                                        onChange={(e) => setOllamaUrl(e.target.value)}
                                        style={{
                                            background: "#0f0e0c", border: "1px solid #2a2820", borderRadius: 7,
                                            color: "#e8e4dc", padding: "7px 12px", fontSize: 12,
                                            fontFamily: "'DM Mono', monospace", width: 220,
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 11, color: "#8a8680", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
                                        MODEL
                                    </label>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        style={{
                                            background: "#0f0e0c", border: "1px solid #2a2820", borderRadius: 7,
                                            color: "#e8e4dc", padding: "7px 12px", fontSize: 12,
                                            fontFamily: "'DM Mono', monospace",
                                        }}
                                    >
                                        <option>mistral:7b</option>
                                        <option>llama3.1:8b</option>
                                        <option>llama3:8b</option>
                                        <option>gemma3:9b</option>
                                        <option>phi4:14b</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                    {!useClaudeApi && (
                        <p style={{ margin: "14px 0 0", fontSize: 11, color: "#6b6860", fontFamily: "'DM Mono', monospace" }}>
                            ↳ run: <span style={{ color: "#c9a84c" }}>ollama serve</span> · then: <span style={{ color: "#c9a84c" }}>ollama pull {model}</span>
                        </p>
                    )}
                </div>
            )}

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 40px 0", position: "relative", zIndex: 1 }}>
                {/* Sample buttons */}
                <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
                        TRY A SAMPLE →
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {SAMPLE_EMAILS.map((s) => (
                            <button
                                key={s.label}
                                className="sample-btn"
                                onClick={() => { setEmailText(s.text); setAnalysis(null); setError(""); }}
                                style={{
                                    background: "transparent",
                                    border: "1px solid #2a2820",
                                    color: "#8a8680",
                                    padding: "6px 14px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    transition: "all .15s",
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Textarea */}
                <div
                    style={{
                        background: "#141311",
                        border: "1px solid #2a2820",
                        borderRadius: 14,
                        overflow: "hidden",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #1e1c18",
                            fontSize: 10,
                            color: "#4a4740",
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "0.1em",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <span>EMAIL INPUT</span>
                        {emailText && (
                            <button
                                onClick={() => { setEmailText(""); setAnalysis(null); setError(""); }}
                                style={{
                                    background: "transparent", border: "none", color: "#6b6860",
                                    cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace",
                                }}
                            >
                                clear ×
                            </button>
                        )}
                    </div>
                    <textarea
                        value={emailText}
                        onChange={(e) => { setEmailText(e.target.value); setAnalysis(null); setError(""); }}
                        placeholder="Paste an email here — full thread, headers, and all..."
                        rows={10}
                        style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "#e8e4dc",
                            fontSize: 13.5,
                            lineHeight: 1.7,
                            padding: "16px 20px",
                            resize: "vertical",
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "0.01em",
                        }}
                    />
                </div>

                {error && (
                    <div
                        style={{
                            background: "#1a0f0f",
                            border: "1px solid #4a1010",
                            borderRadius: 10,
                            padding: "12px 16px",
                            marginBottom: 12,
                            fontSize: 12,
                            color: "#ef4444",
                            fontFamily: "'DM Mono', monospace",
                        }}
                    >
                        ✕ {error}
                    </div>
                )}

                <button
                    className="analyze-btn"
                    onClick={analyze}
                    disabled={loading || !emailText.trim()}
                    style={{
                        width: "100%",
                        padding: "15px",
                        background: "#c9a84c",
                        border: "none",
                        borderRadius: 12,
                        color: "#0f0e0c",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.03em",
                        transition: "all .2s",
                        marginBottom: 40,
                    }}
                >
                    {loading ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <PulsingDot color="#0f0e0c" />
                            Analyzing with {useClaudeApi ? "Claude" : model}...
                        </span>
                    ) : (
                        "→ Analyze Email"
                    )}
                </button>

                {/* Loading skeleton */}
                {loading && (
                    <div style={{ animation: "fadeSlideUp .3s ease" }}>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="shimmer"
                                style={{
                                    height: i === 1 ? 120 : 80,
                                    borderRadius: 12,
                                    marginBottom: 12,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Results */}
                {analysis && meta && (
                    <div ref={resultsRef} style={{ animation: "fadeSlideUp .5s ease" }}>
                        {/* Sentiment header card */}
                        <div
                            style={{
                                background: "#141311",
                                border: `1px solid ${meta.border}22`,
                                borderRadius: 16,
                                padding: 28,
                                marginBottom: 16,
                                display: "flex",
                                gap: 28,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <ScoreArc score={analysis.confidence} color={meta.color} />

                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                    <span style={{ fontSize: 28 }}>{meta.icon}</span>
                                    <span
                                        style={{
                                            fontFamily: "'Playfair Display', serif",
                                            fontSize: 28,
                                            fontWeight: 800,
                                            color: meta.color,
                                            letterSpacing: "-0.5px",
                                        }}
                                    >
                                        {meta.label}
                                    </span>
                                    {analysis.secondary_sentiments?.length > 0 && (
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {analysis.secondary_sentiments.slice(0, 3).map((s) => (
                                                <span
                                                    key={s}
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#8a8680",
                                                        background: "#1a1916",
                                                        border: "1px solid #2a2820",
                                                        padding: "2px 8px",
                                                        borderRadius: 12,
                                                        fontFamily: "'DM Mono', monospace",
                                                    }}
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p style={{ margin: "0 0 12px", color: "#c8c4bc", fontSize: 14, lineHeight: 1.6 }}>
                                    {analysis.tone_summary}
                                </p>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                    <div>
                                        <span style={{ fontSize: 10, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
                                            RISK
                                        </span>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: riskColors[analysis.risk_level] || "#6b7280",
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            ● {analysis.risk_level}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 10, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
                                            RESPOND
                                        </span>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c" }}>
                                            {analysis.recommended_response_urgency}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 10, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
                                            INTENT
                                        </span>
                                        <div style={{ fontSize: 13, color: "#e8e4dc", maxWidth: 260 }}>
                                            {analysis.intent}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key signals */}
                        {analysis.key_signals?.length > 0 && (
                            <div
                                style={{
                                    background: "#141311",
                                    border: "1px solid #2a2820",
                                    borderRadius: 12,
                                    padding: "16px 20px",
                                    marginBottom: 16,
                                }}
                            >
                                <p style={{ margin: "0 0 12px", fontSize: 10, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
                                    KEY SIGNALS
                                </p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {analysis.key_signals.map((s, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                fontSize: 12,
                                                color: "#c8c4bc",
                                                background: "#1a1916",
                                                border: "1px solid #2a2820",
                                                padding: "5px 12px",
                                                borderRadius: 20,
                                                fontFamily: "'DM Mono', monospace",
                                            }}
                                        >
                                            · {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reply drafts */}
                        <p style={{ margin: "24px 0 12px", fontSize: 10, color: "#6b6860", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
                            REPLY DRAFTS — choose your tone
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {Object.entries(analysis.replies || {}).map(([tone, text], idx) => {
                                const ts = TONE_STYLES[tone] || { emoji: "💬", color: "#6b6860", accent: "#1a1916" };
                                return (
                                    <div
                                        key={tone}
                                        className="reply-card"
                                        style={{
                                            background: "#141311",
                                            border: "1px solid #2a2820",
                                            borderRadius: 14,
                                            overflow: "hidden",
                                            transition: "background .15s",
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: "10px 18px",
                                                borderBottom: "1px solid #1e1c18",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{ts.emoji}</span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: ts.color,
                                                        fontFamily: "'DM Mono', monospace",
                                                        letterSpacing: "0.1em",
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {tone}
                                                </span>
                                            </div>
                                            <button
                                                className="copy-btn"
                                                onClick={() => copyReply(text, idx)}
                                                style={{
                                                    background: "transparent",
                                                    border: "1px solid #2a2820",
                                                    color: copiedIdx === idx ? "#22c55e" : "#6b6860",
                                                    padding: "4px 12px",
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    cursor: "pointer",
                                                    fontFamily: "'DM Mono', monospace",
                                                    transition: "all .15s",
                                                }}
                                            >
                                                {copiedIdx === idx ? "✓ copied" : "copy"}
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                padding: "16px 18px",
                                                fontSize: 13.5,
                                                lineHeight: 1.75,
                                                color: "#c8c4bc",
                                                whiteSpace: "pre-wrap",
                                                fontFamily: "'DM Sans', sans-serif",
                                            }}
                                        >
                                            {text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                marginTop: 32,
                                padding: "16px 20px",
                                borderTop: "1px solid #1e1c18",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 11,
                                color: "#4a4740",
                                fontFamily: "'DM Mono', monospace",
                            }}
                        >
                            <span>
                                analyzed with {useClaudeApi ? "claude-sonnet-4" : model}
                            </span>
                            <span style={{ color: "#c9a84c" }}>Week 4 · portfolio.dev</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}