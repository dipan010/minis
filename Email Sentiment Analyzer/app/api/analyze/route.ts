import { NextRequest, NextResponse } from "next/server";
import { analyzeWithClaude, analyzeWithOllama } from "../../../lib/analyzer";

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
