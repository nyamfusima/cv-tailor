import { COURSEWORK_LENGTH_LIMIT, looksLikeCourseworkBleed } from "./courseworkBounds";
import { normalizeKey } from "./json";
import type { CanonicalCV } from "./types";

export type SectionIntegrityCode =
  | "COURSEWORK_SECTION_BLEED"
  | "CROSS_SECTION_DUPLICATION"
  | "COURSEWORK_CONTAINS_PROJECT"
  | "COURSEWORK_CONTAINS_DESCRIPTION"
  | "COURSEWORK_CONTAINS_TECHNOLOGIES"
  | "BROKEN_NUMERIC_TOKEN"
  | "DUPLICATE_SECTION_LABEL"
  | "SUSPICIOUS_COURSEWORK_LENGTH";

export interface SectionIntegrityIssue {
  code: SectionIntegrityCode;
  severity: "high" | "medium";
  section: string;
  message: string;
  evidence?: string;
}

export interface SectionIntegrityReport {
  valid: boolean;
  issues: SectionIntegrityIssue[];
}

export class SectionIntegrityError extends Error {
  constructor(
    message: string,
    readonly report: SectionIntegrityReport,
    readonly source: CanonicalCV,
  ) {
    super(message);
    this.name = "SectionIntegrityError";
  }
}

function ngrams(text: string, size = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  const grams = new Set<string>();
  if (words.length < size) {
    if (words.length) grams.add(words.join(" "));
    return grams;
  }
  for (let i = 0; i <= words.length - size; i += 1) {
    grams.add(words.slice(i, i + size).join(" "));
  }
  return grams;
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const gram of a) if (b.has(gram)) n += 1;
  return n;
}

function brokenNumericToken(text: string): boolean {
  return (
    /\b\d\s*,\s*\d{3}\b/.test(text) ||
    /\b0{2,}\d*\+?(\s+active)?(\s+users)?\b/i.test(text) ||
    /^\d{1,2}$/.test(text.trim()) ||
    /^0+\d*\+?$/.test(text.trim())
  );
}

export function validateSectionIntegrity(cv: CanonicalCV): SectionIntegrityReport {
  const issues: SectionIntegrityIssue[] = [];
  const projectNames = cv.projects.map((project) => normalizeKey(project.name)).filter(Boolean);
  const projectDescriptions = cv.projects.map((project) => project.description.trim()).filter(Boolean);
  const projectCorpus = cv.projects
    .flatMap((project) => [project.name, project.description, ...project.technologies, ...project.bullets])
    .join("\n");
  const projectGrams = ngrams(projectCorpus);

  const seenLabels = new Set<string>();
  const allCourseTexts: string[] = [];

  for (const edu of cv.education) {
    const labelsInEdu: string[] = [];
    for (const course of edu.coursework) {
      const text = course.text.trim();
      allCourseTexts.push(text);
      const labelKey = normalizeKey(text.replace(/:$/, ""));
      if (/^relevant areas?:?$/i.test(text) || /^relevant coursework:?$/i.test(text) || /^coursework:?$/i.test(text)) {
        labelsInEdu.push(text);
        if (seenLabels.has(labelKey)) {
          issues.push({
            code: "DUPLICATE_SECTION_LABEL",
            severity: "high",
            section: "education.coursework",
            message: "A coursework label is repeated.",
            evidence: text,
          });
        }
        seenLabels.add(labelKey);
        issues.push({
          code: "COURSEWORK_SECTION_BLEED",
          severity: "high",
          section: "education.coursework",
          message: "A section label was stored as a coursework item.",
          evidence: text,
        });
      }

      if (looksLikeCourseworkBleed(text) || /\bprojects?\b/i.test(text)) {
        issues.push({
          code: "COURSEWORK_SECTION_BLEED",
          severity: "high",
          section: "education.coursework",
          message: "Coursework contains a later-section heading or project sentence.",
          evidence: text,
        });
      }
      if (/\btechnologies\s*:/i.test(text)) {
        issues.push({
          code: "COURSEWORK_CONTAINS_TECHNOLOGIES",
          severity: "high",
          section: "education.coursework",
          message: "Coursework contains a Technologies label.",
          evidence: text,
        });
      }
      if (projectNames.includes(normalizeKey(text)) || projectNames.some((name) => name && normalizeKey(text).includes(name))) {
        issues.push({
          code: "COURSEWORK_CONTAINS_PROJECT",
          severity: "high",
          section: "education.coursework",
          message: "A project title appears inside coursework.",
          evidence: text,
        });
      }
      if (projectDescriptions.some((desc) => desc && (normalizeKey(text).includes(normalizeKey(desc).slice(0, 40)) || normalizeKey(desc).includes(normalizeKey(text))))) {
        issues.push({
          code: "COURSEWORK_CONTAINS_DESCRIPTION",
          severity: "high",
          section: "education.coursework",
          message: "A project description appears inside coursework.",
          evidence: text,
        });
      }
      if (overlapCount(ngrams(text), projectGrams) >= 2) {
        issues.push({
          code: "CROSS_SECTION_DUPLICATION",
          severity: "high",
          section: "education.coursework",
          message: "Coursework overlaps project content.",
          evidence: text,
        });
      }
      if (text.length > COURSEWORK_LENGTH_LIMIT) {
        issues.push({
          code: "SUSPICIOUS_COURSEWORK_LENGTH",
          severity: "high",
          section: "education.coursework",
          message: "A coursework item is too long to be a course title.",
          evidence: text,
        });
      }
      if (brokenNumericToken(text)) {
        issues.push({
          code: "BROKEN_NUMERIC_TOKEN",
          severity: "high",
          section: "education.coursework",
          message: "A thousands-separated number was split across coursework items.",
          evidence: text,
        });
      }
    }
    if (labelsInEdu.length > 1) {
      issues.push({
        code: "DUPLICATE_SECTION_LABEL",
        severity: "high",
        section: "education.coursework",
        message: "Coursework labels are duplicated.",
        evidence: labelsInEdu.join(" | "),
      });
    }
  }

  const uniqueCourse = new Set(allCourseTexts.map((text) => normalizeKey(text)));
  for (const project of cv.projects) {
    if (uniqueCourse.has(normalizeKey(project.name))) {
      issues.push({
        code: "CROSS_SECTION_DUPLICATION",
        severity: "high",
        section: "projects",
        message: "The same project appears as coursework.",
        evidence: project.name,
      });
    }
  }

  const high = issues.some((issue) => issue.severity === "high");
  return { valid: !high, issues };
}

export function validatePresentation(cv: CanonicalCV): SectionIntegrityReport {
  const issues: SectionIntegrityIssue[] = [];
  if (cv.skills.some((group) => normalizeKey(group.category) === "key skills")) {
    issues.push({
      code: "DUPLICATE_SECTION_LABEL",
      severity: "medium",
      section: "skills",
      message: "KEY SKILLS is used as both a heading and an inline category label.",
      evidence: cv.skills.find((group) => /^key\s+skills$/i.test(group.category))?.category,
    });
  }

  for (const group of cv.skills) {
    const blob = group.skills.map((skill) => skill.name).join(", ");
    if (blob.length > 280 && group.skills.length <= 2) {
      issues.push({
        code: "SUSPICIOUS_COURSEWORK_LENGTH",
        severity: "medium",
        section: "skills",
        message: "A skills group looks like an unstructured paragraph.",
        evidence: blob.slice(0, 80),
      });
    }
  }

  const combined = validateSectionIntegrity(cv);
  const all = [...combined.issues, ...issues];
  return {
    valid: !all.some((issue) => issue.severity === "high"),
    issues: all,
  };
}
