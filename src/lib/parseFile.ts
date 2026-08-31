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

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
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
  }

  if (file.name.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    const rawTextLength = result.value.trim().length;
    return {
      text: result.value,
      rawTextLength,
      isLikelyImageOnly: rawTextLength < 80,
      kind: "docx",
    };
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

export async function parseFile(file: File): Promise<string> {
  const parsed = await parseFileWithMeta(file);
  return parsed.text;
}
