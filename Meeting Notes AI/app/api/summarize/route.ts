import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

const SYSTEM_PROMPT = `You are an expert meeting analyst. Your job is to extract structured information from meeting transcripts.

Given a meeting transcript, you MUST respond with ONLY valid JSON — no markdown fences, no explanation, no preamble. 

Return this exact JSON structure:
{
  "title": "short title summarising the meeting topic",
  "summary": "2-3 sentence plain-English summary of what the meeting was about and the overall outcome",
  "decisions": [
    {
      "id": "d1",
      "text": "decision made"
    }
  ],
  "action_items": [
    {
      "id": "a1",
      "task": "clear description of the task",
      "owner": "person responsible (or 'Unassigned' if not mentioned)",
      "deadline": "deadline if mentioned (or 'Not specified')",
      "priority": "high | medium | low"
    }
  ],
  "key_points": [
    "important discussion point or insight from the meeting"
  ],
  "participants": ["name1", "name2"],
  "sentiment": "positive | neutral | tense | mixed"
}

Rules:
- Extract ALL action items — even implicit ones like "John will look into that"
- Decisions are things that were agreed upon or resolved
- Key points are important insights, blockers, or information shared (3-6 items)
- Be specific — avoid vague descriptions
- If a field has no data, use an empty array []
- ONLY output valid JSON, nothing else`;

export async function POST(req: NextRequest) {
    const { transcript } = await req.json();

    if (!transcript || transcript.trim().length < 20) {
        return new Response(
            JSON.stringify({ error: "Transcript is too short or empty." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const body = JSON.stringify({
        model: MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
                role: "user",
                content: `Here is the meeting transcript:\n\n${transcript}`,
            },
        ],
        stream: true,
        options: {
            temperature: 0.1, // Low temp for consistent structured output
            num_predict: 2048,
        },
    });

    let ollamaRes: Response;
    try {
        ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
        });
    } catch {
        return new Response(
            JSON.stringify({
                error:
                    "Cannot reach Ollama. Make sure it is running on localhost:11434 and llama3.1:8b is pulled.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }

    if (!ollamaRes.ok) {
        const text = await ollamaRes.text();
        return new Response(
            JSON.stringify({ error: `Ollama error: ${text}` }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    // Stream Ollama's response back to the client as plain text chunks
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const reader = ollamaRes.body!.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter((l) => l.trim());

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            if (json.message?.content) {
                                controller.enqueue(encoder.encode(json.message.content));
                            }
                            if (json.done) {
                                controller.close();
                                return;
                            }
                        } catch {
                            // skip malformed lines
                        }
                    }
                }
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
        },
    });
}