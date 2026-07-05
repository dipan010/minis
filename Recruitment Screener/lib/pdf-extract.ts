// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/**
 * Extract text from a PDF File object (used by the REST API endpoint).
 */
export async function extractPdfText(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return extractPdfTextFromBuffer(buffer);
}

/**
 * Extract text from a raw PDF Buffer (used by the A2A endpoint for FilePart base64 data).
 */
export async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text as string;
}
