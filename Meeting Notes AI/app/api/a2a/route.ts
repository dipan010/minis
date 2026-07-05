import { NextRequest } from "next/server";
import {
    A2AHandler,
    TaskStore,
    TaskSendParams,
    Artifact,
    Message,
    DataPart,
    TextPart,
    TaskStreamEvent,
} from "a2a-core-ts";
import { summarizeMeeting, summarizeMeetingStream } from "../../../lib/summarizer";

export const runtime = "nodejs";
export const maxDuration = 120;

const taskStore = new TaskStore();

const handler = new A2AHandler({
    taskStore,

    // Non-streaming: tasks/send
    onTaskSend: async (params: TaskSendParams) => {
        const textPart = params.message.parts.find(
            (p): p is TextPart => p.type === "text"
        );
        if (!textPart || textPart.text.trim().length < 20) {
            throw new Error("Transcript is too short or empty. Send at least 20 characters as a TextPart.");
        }

        const result = await summarizeMeeting(textPart.text);

        const artifacts: Artifact[] = [
            {
                name: "meeting-analysis",
                description: "Structured meeting analysis",
                parts: [
                    { type: "data", data: result as unknown as Record<string, unknown> } as DataPart,
                ],
            },
        ];

        const agentMessage: Message = {
            role: "agent",
            parts: [
                { type: "text", text: result.summary } as TextPart,
            ],
        };

        return { artifacts, agentMessage };
    },

    // Streaming: tasks/sendSubscribe
    onTaskStream: async (
        params: TaskSendParams,
        onEvent: (event: TaskStreamEvent) => void,
    ) => {
        const textPart = params.message.parts.find(
            (p): p is TextPart => p.type === "text"
        );
        if (!textPart || textPart.text.trim().length < 20) {
            throw new Error("Transcript is too short or empty.");
        }

        // Signal working
        onEvent({ type: "status", status: "working" });

        // Accumulate the full response for final parsing
        let accumulated = "";

        // Create stream with chunk callback
        const readable = summarizeMeetingStream(textPart.text, (chunk: string) => {
            accumulated += chunk;
            // Send intermediate text artifact updates
            onEvent({
                type: "artifact",
                artifact: {
                    name: "streaming-text",
                    description: "Streaming transcript analysis text",
                    parts: [{ type: "text", text: accumulated } as TextPart],
                },
            });
        });

        // Consume the stream fully
        const reader = readable.getReader();
        while (true) {
            const { done } = await reader.read();
            if (done) break;
        }

        // Parse final result and emit as DataPart artifact
        try {
            const clean = accumulated.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(clean);
            onEvent({
                type: "artifact",
                artifact: {
                    name: "meeting-analysis",
                    description: "Structured meeting analysis",
                    parts: [
                        { type: "data", data: parsed } as DataPart,
                    ],
                },
            });
        } catch {
            // If JSON parsing fails, emit raw text as final artifact
            onEvent({
                type: "artifact",
                artifact: {
                    name: "meeting-analysis-raw",
                    description: "Raw meeting analysis text (JSON parse failed)",
                    parts: [{ type: "text", text: accumulated } as TextPart],
                },
            });
        }
    },
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    return handler.handleRequest(body);
}
