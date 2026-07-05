import { NextRequest } from "next/server";
import { summarizeMeetingStream } from "../../../lib/summarizer";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
    const { transcript } = await req.json();

    if (!transcript || transcript.trim().length < 20) {
        return new Response(
            JSON.stringify({ error: "Transcript is too short or empty." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        const readable = summarizeMeetingStream(transcript);

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
            },
        });
    } catch {
        return new Response(
            JSON.stringify({
                error: "Cannot reach Ollama. Make sure it is running on localhost:11434 and llama3.1:8b is pulled.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }
}
