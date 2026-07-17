import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  extractFromImage,
  extractFromPDF,
  runExtractionPipeline,
} from "@/lib/extraction";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Normalize an uploaded image for the vision model: cap width at 1200px,
 * flatten transparency onto white, boost contrast slightly, emit PNG. */
async function preprocessImage(buffer: Buffer): Promise<string> {
  const processed = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .normalize()
    .png()
    .toBuffer();
  return processed.toString("base64");
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart/form-data with a `file` field." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const ollamaUrl = (formData.get("ollamaUrl") as string | null) ?? undefined;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Upload a tax form as `file` (image/* or application/pdf)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File too large — limit is 15 MB." },
      { status: 413 }
    );
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type}". Upload an image or a PDF.` },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText: string;
    if (isPdf) {
      rawText = await extractFromPDF(buffer);
    } else {
      const base64 = await preprocessImage(buffer);
      rawText = await extractFromImage(base64, { ollamaUrl });
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          error: isPdf
            ? "No text could be extracted from this PDF. If it is a scanned PDF, export the page as an image and upload that instead."
            : "The vision model returned no text for this image.",
        },
        { status: 422 }
      );
    }

    const result = await runExtractionPipeline(rawText, { ollamaUrl });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
