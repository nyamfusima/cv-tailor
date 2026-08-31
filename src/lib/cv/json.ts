import { ModelJsonParseError } from "./types";

/** Strip markdown fences and extract the first complete JSON object. */
export function extractJSON(raw: string): string {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return cleaned;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned;
}

export function isIncompleteFinishReason(finishReason?: string): boolean {
  return finishReason === "length" || finishReason === "incomplete" || finishReason === "content_filter";
}

export function parseModelJson(raw: string, finishReason?: string): unknown {
  if (isIncompleteFinishReason(finishReason)) {
    throw new ModelJsonParseError("Model output was truncated or incomplete and cannot be accepted.");
  }
  if (!raw || !raw.trim()) {
    throw new ModelJsonParseError("Model returned an empty response.");
  }
  const extracted = extractJSON(raw);
  try {
    return JSON.parse(extracted);
  } catch {
    throw new ModelJsonParseError("Failed to parse model JSON.");
  }
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        return asString((item as { text: unknown }).text);
      }
      if (item && typeof item === "object" && "name" in item) {
        return asString((item as { name: unknown }).name);
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
