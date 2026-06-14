import { NextRequest, NextResponse } from "next/server";
import { scoreMatch } from "@/lib/ollama";

export const runtime = "nodejs";

// Import pdf-parse via the internal lib path rather than the package root.
// The root entry point (require("pdf-parse")) runs a debug self-test that
// tries to read a bundled test PDF from disk, which fails in Next.js and
// serverless environments. Using lib/pdf-parse.js skips that check entirely.
// This is a well-known community workaround for pdf-parse@1.1.1.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

async function extractPdfText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);
  return data.text as string;
}

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
    return NextResponse.json(result);
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
