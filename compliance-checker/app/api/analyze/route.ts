import { NextRequest, NextResponse } from "next/server";
import { extractRequirements } from "@/lib/requirementExtractor";
import { analyzeCompliance } from "@/lib/complianceAnalyzer";
import { generateReport } from "@/lib/reportGenerator";
import type { DocumentInput } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export const runtime = "nodejs";
export const maxDuration = 600;

const PIPELINE_TIMEOUT_MS = 300_000; // many batched Ollama calls

async function readDocument(
  fd: FormData,
  prefix: "policy" | "regulation"
): Promise<DocumentInput> {
  const file = fd.get(`${prefix}File`);
  const title = ((fd.get(`${prefix}Title`) as string | null) ?? "").trim() || `Untitled ${prefix}`;

  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    return { title, content: (parsed.text as string) ?? "", type: prefix };
  }
  return {
    title,
    content: ((fd.get(`${prefix}Text`) as string | null) ?? "").trim(),
    type: prefix,
  };
}

export async function POST(request: NextRequest) {
  let policy: DocumentInput;
  let regulation: DocumentInput;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      policy = await readDocument(fd, "policy");
      regulation = await readDocument(fd, "regulation");
    } else {
      const body = await request.json();
      policy = body.policy;
      regulation = body.regulation;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    );
  }

  if (!policy?.content?.trim() || policy.content.trim().length < 200) {
    return NextResponse.json(
      { error: "Policy document text is required (at least ~200 characters)." },
      { status: 400 }
    );
  }
  if (!regulation?.content?.trim() || regulation.content.trim().length < 200) {
    return NextResponse.json(
      { error: "Regulation text is required (at least ~200 characters)." },
      { status: 400 }
    );
  }

  try {
    const report = await Promise.race([
      (async () => {
        const requirements = await extractRequirements(regulation.content);
        const results = await analyzeCompliance(policy.content, requirements);
        return generateReport(policy.title, regulation.title, requirements, results);
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Gap analysis timed out after 5 minutes (many batched LLM calls).")),
          PIPELINE_TIMEOUT_MS
        )
      ),
    ]);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
