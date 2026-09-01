import type { TailoredCV } from "../types";

const ILLEGAL = /[\\/:*?"<>|]+/g;

export function tailoredDownloadFileName(
  cv: Pick<TailoredCV, "name" | "experience" | "meta">,
): string {
  return `${personNameForFile(cv.name)} - ${jobRoleForFile(cv)}.pdf`;
}

export function jobTitleFromDescription(jobDescription?: string): string {
  if (!jobDescription?.trim()) return "";
  const lines = jobDescription.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(job description|about (the )?(role|company|us)|overview|who we are|responsibilities)\b/i.test(line)) {
      continue;
    }
    if (line.length <= 70) return sanitizeRole(line);
    return sanitizeRole(line.split(/\s+/).slice(0, 6).join(" "));
  }
  return "";
}

function personNameForFile(name: string): string {
  const parts = name.trim().split(/\s+/).map(sanitizeToken).filter(Boolean);
  if (!parts.length) return "CV";
  const first = parts[0];
  const second = parts.slice(1).join("_");
  return second ? `${first}_${second}` : first;
}

function jobRoleForFile(cv: Pick<TailoredCV, "experience" | "meta">): string {
  const raw = jobTitleFromDescription(cv.meta?.jobDescriptionPreview)
    || cv.meta?.primaryRole
    || cv.experience?.[0]?.title
    || "CV";
  return sanitizeRole(raw) || "CV";
}

function sanitizeToken(value: string): string {
  return value.replace(ILLEGAL, "").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function sanitizeRole(value: string): string {
  return value.replace(ILLEGAL, " ").replace(/\s+/g, " ").trim();
}
