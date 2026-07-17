import { NextRequest, NextResponse } from "next/server";
import { scoreMatch } from "@/lib/ollama";
import { extractPdfText } from "@/lib/pdf-extract";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data." },
      { status: 400 }
    );
  }

  const jobDescriptionFile = formData.get("jobDescriptionFile");
  const resumeFile = formData.get("resumeFile");
  const model = (formData.get("model") as string | null) ?? undefined;
  const ollamaUrl = (formData.get("ollamaUrl") as string | null) ?? undefined;

  // PDF overrides pasted text for the same side
  let jobDescription: string;
  if (jobDescriptionFile instanceof File && jobDescriptionFile.size > 0) {
    jobDescription = await extractPdfText(jobDescriptionFile);
  } else {
    jobDescription = ((formData.get("jobDescriptionText") as string | null) ?? "").trim();
  }

  let resumeText: string;
  if (resumeFile instanceof File && resumeFile.size > 0) {
    resumeText = await extractPdfText(resumeFile);
  } else {
    resumeText = ((formData.get("resumeText") as string | null) ?? "").trim();
  }

  if (!jobDescription) {
    return NextResponse.json(
      { error: "Job description is required. Provide jobDescriptionText or a jobDescriptionFile PDF." },
      { status: 400 }
    );
  }

  if (!resumeText) {
    return NextResponse.json(
      { error: "Resume is required. Provide resumeText or a resumeFile PDF." },
      { status: 400 }
    );
  }

  try {
    const result = await scoreMatch(jobDescription, resumeText, { model, ollamaUrl });
    // Echo the resolved inputs back so the client can pass them to the
    // question-bank and bias-check endpoints even when a PDF was uploaded.
    return NextResponse.json({ ...result, inputs: { jobDescription, resumeText } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = message.includes("fetch failed")
      ? " Is Ollama running? Try: ollama serve"
      : "";
    return NextResponse.json(
      { error: `${message}${hint}` },
      { status: 500 }
    );
  }
}
