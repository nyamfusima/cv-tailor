import type { CanonicalCV } from "./types";

export type HardRequirementStatus = "meets" | "needs_verification" | "missing";

export interface HardRequirementItem {
  requirement: string;
  candidateEvidence: string | string[];
  status: HardRequirementStatus;
  severity?: "high" | "medium";
}

export interface HardRequirements {
  education: HardRequirementItem;
  graduationWindow: HardRequirementItem;
  programmingLanguage: HardRequirementItem;
}

function sourceText(source: CanonicalCV): string {
  return [
    source.summary,
    ...source.education.flatMap((edu) => [edu.degree, edu.institution, edu.dates]),
    ...source.skills.flatMap((group) => group.skills.map((skill) => skill.name)),
    ...source.experience.flatMap((job) => [job.title, ...job.sourceBullets.map((b) => b.text)]),
    ...source.projects.flatMap((project) => [project.name, project.description, ...project.technologies]),
  ].join("\n");
}

function requiresBachelor(jobDescription: string): boolean {
  return /\b(bachelor'?s|bachelors|bsc|b\.?s\.?|degree or above|undergraduate degree)\b/i.test(jobDescription);
}

function educationEvidence(source: CanonicalCV): { text: string; level: "bachelor" | "masters" | "diploma" | "unknown" } {
  const text = source.education.map((edu) => `${edu.degree} ${edu.dates}`).join("; ") || "None recorded";
  if (/\b(master|msc|m\.?s\.?|mba)\b/i.test(text)) return { text, level: "masters" };
  if (/\b(bachelor|bsc|b\.?com|b\.?s\.?|honours degree)\b/i.test(text)) return { text, level: "bachelor" };
  if (/\bdiploma\b/i.test(text)) return { text, level: "diploma" };
  return { text, level: "unknown" };
}

function graduationEvidence(source: CanonicalCV): { text: string; meets: boolean } {
  const text = source.education.map((edu) => edu.dates).filter(Boolean).join("; ") || "Not recorded";
  const yearMatch = text.match(/(20\d{2})/g);
  const years = (yearMatch ?? []).map(Number);
  const latest = years.length ? Math.max(...years) : null;
  const meets = latest != null && latest >= 2025 && latest <= 2027;
  return { text, meets };
}

const LANGUAGES = ["Python", "Java", "TypeScript", "JavaScript", "Go", "C++", "C#"] as const;

export function analyzeHardRequirements(source: CanonicalCV, jobDescription: string): HardRequirements {
  const education = educationEvidence(source);
  const bachelorRequired = requiresBachelor(jobDescription);
  const educationStatus: HardRequirementStatus =
    !bachelorRequired ? "meets" : education.level === "bachelor" || education.level === "masters" ? "meets" : "needs_verification";

  const graduation = graduationEvidence(source);
  const corpus = sourceText(source);
  const langs = LANGUAGES.filter((lang) => {
    if (lang === "C++") return /\bc\+\+\b/i.test(corpus);
    if (lang === "C#") return /\bc#\b/i.test(corpus);
    return new RegExp(`\\b${lang}\\b`, "i").test(corpus);
  });

  return {
    education: {
      requirement: bachelorRequired
        ? "Bachelor's degree or above in a related STEM field"
        : "No bachelor's-degree requirement detected",
      candidateEvidence: education.text,
      status: educationStatus,
      severity: educationStatus === "needs_verification" ? "high" : undefined,
    },
    graduationWindow: {
      requirement: "October 2025 to September 2026 or within 24 months",
      candidateEvidence: graduation.text,
      status: graduation.meets ? "meets" : "needs_verification",
    },
    programmingLanguage: {
      requirement: "At least one listed programming language",
      candidateEvidence: langs,
      status: langs.length > 0 ? "meets" : "missing",
    },
  };
}
