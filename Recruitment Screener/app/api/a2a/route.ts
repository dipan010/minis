import { NextRequest } from "next/server";
import {
    A2AHandler,
    TaskStore,
    TaskSendParams,
    Artifact,
    Message,
    DataPart,
    TextPart,
    FilePart,
    Part,
} from "a2a-core-ts";
import { scoreMatch } from "@/lib/ollama";
import { extractPdfTextFromBuffer } from "@/lib/pdf-extract";

export const runtime = "nodejs";

const taskStore = new TaskStore();

/**
 * Extract text from a Part — handles both TextPart (direct text) and FilePart (base64 PDF).
 */
async function extractTextFromPart(part: Part): Promise<string> {
    if (part.type === "text") {
        return part.text;
    }
    if (part.type === "file" && part.file.bytes) {
        const buffer = Buffer.from(part.file.bytes, "base64");
        return extractPdfTextFromBuffer(buffer);
    }
    throw new Error(`Unsupported part type: ${part.type}. Use TextPart or FilePart (PDF).`);
}

const handler = new A2AHandler({
    taskStore,
    onTaskSend: async (params: TaskSendParams) => {
        const parts = params.message.parts;

        // Strategy 1: Look for parts with metadata.role
        let jdPart = parts.find((p) => p.metadata?.role === "job_description");
        let resumePart = parts.find((p) => p.metadata?.role === "resume");

        // Strategy 2: If no metadata roles, try DataPart with jobDescription/resumeText fields
        if (!jdPart && !resumePart) {
            const dataPart = parts.find((p): p is DataPart => p.type === "data");
            if (dataPart?.data?.jobDescription && dataPart?.data?.resumeText) {
                const result = await scoreMatch(
                    dataPart.data.jobDescription as string,
                    dataPart.data.resumeText as string,
                    {
                        model: (dataPart.data.model as string) ?? undefined,
                        ollamaUrl: (dataPart.data.ollamaUrl as string) ?? undefined,
                    }
                );

                return {
                    artifacts: [
                        {
                            name: "screening-result",
                            description: "Resume screening assessment",
                            parts: [{ type: "data", data: result as unknown as Record<string, unknown> } as DataPart],
                        },
                    ],
                    agentMessage: {
                        role: "agent" as const,
                        parts: [{ type: "text", text: result.summary } as TextPart],
                    },
                };
            }
        }

        // Strategy 3: Positional — first two non-data parts (JD first, resume second)
        if (!jdPart || !resumePart) {
            const contentParts = parts.filter((p) => p.type === "text" || p.type === "file");
            if (contentParts.length >= 2) {
                jdPart = jdPart ?? contentParts[0];
                resumePart = resumePart ?? contentParts[1];
            }
        }

        if (!jdPart || !resumePart) {
            throw new Error(
                "Two documents required: job description and resume. " +
                "Either use metadata.role ('job_description'/'resume') on each part, " +
                "or send a DataPart with {jobDescription, resumeText}, " +
                "or send exactly two TextPart/FilePart parts (JD first, resume second)."
            );
        }

        const jobDescription = await extractTextFromPart(jdPart);
        const resumeText = await extractTextFromPart(resumePart);

        // Extract optional model config from DataPart
        const configPart = parts.find((p): p is DataPart => p.type === "data");
        const model = (configPart?.data?.model as string) ?? undefined;
        const ollamaUrl = (configPart?.data?.ollamaUrl as string) ?? undefined;

        const result = await scoreMatch(jobDescription, resumeText, { model, ollamaUrl });

        const artifacts: Artifact[] = [
            {
                name: "screening-result",
                description: "Resume screening assessment",
                parts: [
                    { type: "data", data: result as unknown as Record<string, unknown> } as DataPart,
                ],
            },
        ];

        const agentMessage: Message = {
            role: "agent",
            parts: [
                { type: "text", text: `Score: ${result.overall_score}/100 — ${result.verdict}. ${result.summary}` } as TextPart,
            ],
        };

        return { artifacts, agentMessage };
    },
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    return handler.handleRequest(body);
}
