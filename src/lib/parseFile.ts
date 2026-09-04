import { extractText } from "unpdf";
import mammoth from "mammoth";

export interface ParsedFile {
  text: string;
  rawTextLength: number;
  isLikelyImageOnly: boolean;
  kind: "pdf" | "docx";
}

export function flattenExtractedText(text: unknown): string {
  if (typeof text === "string") return text;
  if (Array.isArray(text)) {
    return text.map((part) => (typeof part === "string" ? part : String(part ?? ""))).join("\n");
  }
  return text == null ? "" : String(text);
}

export async function parseFileWithMeta(file: File): Promise<ParsedFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const isPdf =
    file.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    buffer.subarray(0, 5).toString("utf8") === "%PDF-";
  const isDocx =
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isPdf) {
    try {
      const uint8Array = new Uint8Array(buffer);
      const { text } = await extractText(uint8Array, { mergePages: true });
      const normalized = flattenExtractedText(text);
      const rawTextLength = normalized.trim().length;
      return {
        text: normalized,
        rawTextLength,
        isLikelyImageOnly: rawTextLength < 80,
        kind: "pdf",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse PDF";
      throw new Error(`Could not read this PDF (${message}). Try a text-based PDF or DOCX.`);
    }
  }

  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawTextLength = result.value.trim().length;
      return {
        text: result.value,
        rawTextLength,
        isLikelyImageOnly: rawTextLength < 80,
        kind: "docx",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse DOCX";
      throw new Error(`Could not read this Word file (${message}). Try exporting it again.`);
    }
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

export async function parseFile(file: File): Promise<string> {
  const parsed = await parseFileWithMeta(file);
  return parsed.text;
}
