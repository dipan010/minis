import { NextRequest } from "next/server";
import {
    A2AHandler,
    TaskStore,
    TaskSendParams,
    Artifact,
    Message,
    DataPart,
    TextPart,
} from "a2a-core-ts";
import { analyzeWithClaude, analyzeWithOllama } from "../../../lib/analyzer";

const taskStore = new TaskStore();

const handler = new A2AHandler({
    taskStore,
    onTaskSend: async (params: TaskSendParams) => {
        // Extract email text from the first TextPart
        const textPart = params.message.parts.find(
            (p): p is TextPart => p.type === "text"
        );
        if (!textPart) {
            throw new Error("No text part found in message. Send the email text as a TextPart.");
        }

        const emailText = textPart.text;
        if (!emailText || emailText.trim().length === 0) {
            throw new Error("Email text is empty.");
        }

        // Extract backend preference from DataPart metadata if present
        const dataPart = params.message.parts.find(
            (p): p is DataPart => p.type === "data"
        );
        const backend = (dataPart?.data?.backend as string) ?? "ollama";
        const ollamaUrl = (dataPart?.data?.ollamaUrl as string) ?? "http://localhost:11434";
        const model = (dataPart?.data?.model as string) ?? "mistral:7b";

        // Run analysis
        let result;
        if (backend === "claude") {
            result = await analyzeWithClaude(emailText);
        } else {
            result = await analyzeWithOllama(emailText, ollamaUrl, model);
        }

        // Build artifacts
        const artifacts: Artifact[] = [
            {
                name: "sentiment-analysis",
                description: "Full email sentiment analysis result",
                parts: [
                    {
                        type: "data",
                        data: result,
                    } as DataPart,
                ],
            },
        ];

        // Agent response message
        const agentMessage: Message = {
            role: "agent",
            parts: [
                {
                    type: "text",
                    text: result.tone_summary ?? "Analysis complete.",
                } as TextPart,
            ],
        };

        return { artifacts, agentMessage };
    },
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    return handler.handleRequest(body);
}
