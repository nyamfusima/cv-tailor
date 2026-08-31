import { courseworkDisplay } from "./wire";
import { validatePreservation } from "./validatePreservation";
import type { CanonicalCV, KeywordClassification } from "./types";

export interface EvaluationMetrics {
  protectedFieldRecall: number;
  courseworkRecall: number;
  sectionRecall: number;
  unsupportedClaimCount: number;
  evidenceBackedKeywordPrecision: number;
  validOutputRate: number;
  pdfFieldRetention: number;
  valid: boolean;
}

function ratio(kept: number, total: number): number {
  if (total === 0) return 1;
  return kept / total;
}

export function evaluatePreservation(
  source: CanonicalCV,
  tailored: CanonicalCV,
  classifications: KeywordClassification[] = [],
): EvaluationMetrics {
  const report = validatePreservation(source, tailored);

  const sourceCoursework = source.education.flatMap((e) => e.coursework);
  const tailoredCoursework = new Set(
    tailored.education.flatMap((e) => e.coursework.map((c) => `${c.id}:${c.text}`)),
  );
  const courseworkKept = sourceCoursework.filter((c) => tailoredCoursework.has(`${c.id}:${c.text}`)).length;

  const sourceSections = [
    source.experience.length > 0,
    source.education.length > 0,
    source.skills.length > 0,
    source.certifications.length > 0,
    source.projects.length > 0,
  ].filter(Boolean).length;
  const tailoredSections = [
    tailored.experience.length > 0 && source.experience.length > 0,
    tailored.education.length > 0 && source.education.length > 0,
    tailored.skills.length > 0 && source.skills.length > 0,
    tailored.certifications.length > 0 && source.certifications.length > 0,
    tailored.projects.length > 0 && source.projects.length > 0,
  ].filter(Boolean).length;

  const protectedTotal =
    5 +
    source.experience.length * 3 +
    source.education.length * 3 +
    sourceCoursework.length +
    source.certifications.length * 3 +
    source.projects.length;
  const protectedLost = report.missingIds.length + report.changedProtectedFields.length;

  const used = classifications.filter((c) => c.status === "evidenced_and_used");
  const evidencedUsed = used.filter((c) =>
    tailored.experience.some((j) =>
      j.bulletEvidence.some((e) => e.sourceBulletIds.length > 0 && e.matchedKeywords.includes(c.keyword)),
    ),
  );

  const pdfFields = source.education.flatMap((e) => e.coursework.map((c) => c.text));
  const pdfKept = pdfFields.filter((text) =>
    tailored.education.some((e) => courseworkDisplay(e.coursework.map((c) => c.text))?.includes(text)),
  ).length;

  return {
    protectedFieldRecall: ratio(Math.max(0, protectedTotal - protectedLost), protectedTotal),
    courseworkRecall: ratio(courseworkKept, sourceCoursework.length),
    sectionRecall: ratio(tailoredSections, sourceSections),
    unsupportedClaimCount: report.unsupportedClaims.length,
    evidenceBackedKeywordPrecision: ratio(evidencedUsed.length, used.length),
    validOutputRate: report.valid ? 1 : 0,
    pdfFieldRetention: ratio(pdfKept, pdfFields.length),
    valid: report.valid,
  };
}
