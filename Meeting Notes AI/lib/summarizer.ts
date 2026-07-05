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

import { MeetingAnalysis } from "./types";

function buildOllamaBody(transcript: string, stream: boolean) {
    return JSON.stringify({
        model: MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Here is the meeting transcript:\n\n${transcript}` },
        ],
        stream,
        options: { temperature: 0.1, num_predict: 2048 },
    });
}

/**
 * Non-streaming: wait for full Ollama response and return parsed JSON.
 */
export async function summarizeMeeting(transcript: string): Promise<MeetingAnalysis> {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildOllamaBody(transcript, false),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama error: ${text}`);
    }

    const data = await response.json();
    const content: string = data.message?.content ?? "";
    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
}

/**
 * Streaming: return a ReadableStream that pipes Ollama's chunks as plain text.
 * Also calls onChunk for each text fragment (used by A2A SSE handler).
 */
export function summarizeMeetingStream(
    transcript: string,
    onChunk?: (text: string) => void,
): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let ollamaRes: Response;
            try {
                ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: buildOllamaBody(transcript, true),
                });
            } catch {
                controller.error(
                    new Error("Cannot reach Ollama. Make sure it is running and llama3.1:8b is pulled.")
                );
                return;
            }

            if (!ollamaRes.ok) {
                const text = await ollamaRes.text();
                controller.error(new Error(`Ollama error: ${text}`));
                return;
            }

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
                                onChunk?.(json.message.content);
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
}
