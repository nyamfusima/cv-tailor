import { normalizeKey } from "./json";
import type { CanonicalCV, ExtractionReport } from "./types";

export const DETECTED_HEADINGS = [
  { label: "Experience", pattern: /\b(work\s+)?experience\b|\bemployment\b|\bwork\s+history\b/i },
  { label: "Education", pattern: /\beducation\b|\bacademic\s+background\b/i },
  { label: "Coursework", pattern: /\b(relevant\s+)?coursework\b/i },
  { label: "Certifications", pattern: /\bcertifications?\b|\bprofessional\s+development\b|\blicen[cs]es?\b/i },
  { label: "Projects", pattern: /\bprojects?\b/i },
  { label: "Skills", pattern: /\b(technical\s+)?skills\b|\bcompetenc/i },
  { label: "Languages", pattern: /\blanguages?\b/i },
  { label: "Volunteer Experience", pattern: /\bvolunteer(ing|er)?\b/i },
  { label: "Awards", pattern: /\bawards?\b|\bhonou?rs\b/i },
  { label: "Publications", pattern: /\bpublications?\b/i },
] as const;

export const DEDICATED_SECTION_TITLES = new Set([
  "experience",
  "employment",
  "work experience",
  "work history",
  "education",
  "coursework",
  "relevant coursework",
  "certifications",
  "certification",
  "professional development",
  "projects",
  "project",
  "skills",
  "technical skills",
  "key skills",
  "summary",
  "profile",
  "contact",
  "references",
]);

const SHORT_TEXT = 80;

function courseworkLineCount(cvText: string): number {
  const matches = cvText.match(/(?:relevant\s+)?coursework\s*[:\-–]/gi);
  return matches?.length ?? 0;
}

export function detectSectionHeadings(cvText: string): string[] {
  const found: string[] = [];
  for (const heading of DETECTED_HEADINGS) {
    if (heading.pattern.test(cvText)) found.push(heading.label);
  }
  return found;
}

export function canonicalSectionNames(cv: CanonicalCV): string[] {
  const names: string[] = [];
  if (cv.experience.length) names.push("Experience");
  if (cv.education.length) names.push("Education");
  if (cv.education.some((e) => e.coursework.length)) names.push("Coursework");
  if (cv.certifications.length) names.push("Certifications");
  if (cv.projects.length) names.push("Projects");
  if (cv.skills.length) names.push("Skills");
  for (const section of cv.customSections) names.push(section.title);
  return names;
}

export function buildExtractionReport(input: {
  cvText: string;
  source: CanonicalCV;
  isLikelyImageOnly?: boolean;
  extractIncomplete?: boolean;
}): ExtractionReport {
  const rawTextLength = input.cvText.trim().length;
  const detectedSectionHeadings = detectSectionHeadings(input.cvText);
  const sections = canonicalSectionNames(input.source);
  const detectedCourseworkLines = courseworkLineCount(input.cvText);
  const canonicalCourseworkCount = input.source.education.reduce((n, e) => n + e.coursework.length, 0);
  const warnings: string[] = [];

  const hasHeading = (label: string) => detectedSectionHeadings.includes(label);

  if (input.isLikelyImageOnly || (rawTextLength < SHORT_TEXT && input.isLikelyImageOnly !== false)) {
    if (rawTextLength < SHORT_TEXT) {
      warnings.push("Extracted text is suspiciously short. The file may be image-only or unreadable.");
    }
  }
  if (input.isLikelyImageOnly) {
    warnings.push("PDF appears image-only or contains almost no selectable text.");
  }
  if (hasHeading("Coursework") && canonicalCourseworkCount === 0) {
    warnings.push("Raw text contains a coursework heading but no coursework items were extracted.");
  }
  if (hasHeading("Certifications") && input.source.certifications.length === 0) {
    warnings.push("Raw text contains a certifications heading but no certifications were extracted.");
  }
  if (hasHeading("Education") && input.source.education.length === 0) {
    warnings.push("Raw text contains an education heading but no education entries were extracted.");
  }
  if (hasHeading("Experience") && input.source.experience.length === 0) {
    warnings.push("Raw text contains an experience heading but no experience entries were extracted.");
  }
  if (hasHeading("Projects") && input.source.projects.length === 0) {
    warnings.push("Raw text contains a projects heading but no projects were extracted.");
  }
  if (rawTextLength >= 3000 && input.source.experience.length === 0 && input.source.education.length === 0) {
    warnings.push("A long source produced an unexpectedly small canonical CV.");
  }
  if (input.extractIncomplete) {
    warnings.push("The extraction model response was incomplete or output-limited.");
  }

  const highConfidence = warnings.some((w) =>
    /coursework heading|certifications heading|education heading|image-only|suspiciously short|incomplete|unexpectedly small/i.test(w),
  );

  return {
    rawTextLength,
    detectedSectionHeadings,
    canonicalSectionNames: sections,
    detectedCourseworkLines,
    canonicalCourseworkCount,
    warnings,
    requiresUserReview: warnings.length > 0,
    highConfidence,
    isLikelyImageOnly: Boolean(input.isLikelyImageOnly) || rawTextLength < SHORT_TEXT,
  };
}

export function isDedicatedSectionTitle(title: string): boolean {
  return DEDICATED_SECTION_TITLES.has(normalizeKey(title));
}
