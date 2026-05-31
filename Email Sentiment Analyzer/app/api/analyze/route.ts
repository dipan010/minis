import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert email sentiment analyst. Analyze the email and return ONLY a valid JSON object. No markdown fences, no explanation, just raw JSON.`;

const buildPrompt = (emailText: string) => `Analyze the following email and return ONLY a JSON object with this exact structure:

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
}

Email:
${emailText}`;

async function analyzeWithClaude(emailText: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in environment variables.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: buildPrompt(emailText) }],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
}

async function analyzeWithOllama(emailText: string, ollamaUrl: string, model: string) {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            prompt: buildPrompt(emailText),
            system: SYSTEM_PROMPT,
            stream: false,
            format: "json",
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Ollama error ${response.status}. Is Ollama running at ${ollamaUrl}? ` +
            `Try: ollama serve && ollama pull ${model}`
        );
    }

    const data = await response.json();
    const text: string = data.response ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            emailText,
            backend = "claude",        // "claude" | "ollama"
            ollamaUrl = "http://localhost:11434",
            model = "mistral:7b",
        } = body;

        if (!emailText || typeof emailText !== "string" || emailText.trim().length === 0) {
            return NextResponse.json({ error: "emailText is required." }, { status: 400 });
        }

        if (emailText.length > 20000) {
            return NextResponse.json({ error: "Email is too long (max 20,000 characters)." }, { status: 400 });
        }

        let result;
        if (backend === "claude") {
            result = await analyzeWithClaude(emailText);
        } else {
            result = await analyzeWithOllama(emailText, ollamaUrl, model);
        }

        return NextResponse.json(result);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";

        // JSON parse failures — model returned malformed output
        if (message.includes("JSON")) {
            return NextResponse.json(
                { error: "Model returned malformed JSON. Try again or switch to a different model." },
                { status: 502 }
            );
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}