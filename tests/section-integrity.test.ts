import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv, recoverCourseworkFromText } from "../src/lib/cv/canonical";
import { assessUnsupportedScope } from "../src/lib/cv/claimStrength";
import { createMemoryCreditStore } from "../src/lib/cv/credits";
import { recommendDisplaySelection } from "../src/lib/cv/displaySelection";
import { analyzeHardRequirements } from "../src/lib/cv/hardRequirements";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { SectionIntegrityError, validateSectionIntegrity } from "../src/lib/cv/sectionIntegrity";
import { executeTailorRequest } from "../src/lib/cv/tailorRequest";
import { toTailoredWire } from "../src/lib/cv/wire";
import type { CompleteJsonFn, CompleteJsonResponse } from "../src/lib/cv/types";
import { assertRenderableCv, renderResumePdfBytes } from "../src/lib/generatePDF";
import type { UserCredits } from "../src/lib/types";
import {
  AMAZON_SDE_JD,
  SECTION_BLEED_RAW_CV,
  VALID_BLEED_COURSES,
  cleanBleedSourceCv,
  contaminatedReviewedSource,
  extractedBleedSource,
} from "./fixtures/section-bleed-cv";

function ok(parsed: unknown): CompleteJsonResponse {
  return {
    parsed,
    raw: JSON.stringify(parsed),
    model: "gpt-5.1",
    finishReason: "stop",
    promptTokens: 4,
    completionTokens: 4,
    latencyMs: 2,
    retryCount: 0,
    promptVersion: "test",
  };
}

function emptyDelta() {
  return {
    summary: "Graduate software intern.",
    experience: [],
    projects: [],
    skillOrder: [],
    keywordClassifications: [],
    missingKeywords: ["aws", "ci/cd"],
    assumptions: [],
    conflicts: [],
  };
}

describe("section bleed fixture", () => {
  it("recovers only valid course titles and keeps thousands separators intact", () => {
    const recovered = recoverCourseworkFromText(SECTION_BLEED_RAW_CV);
    assert.deepEqual(recovered.sort(), [...VALID_BLEED_COURSES].sort());
    assert.ok(!recovered.some((item) => /hackerrank|projects|technologies|participants|active users/i.test(item)));
    assert.ok(!recovered.includes("1"));
    assert.ok(!recovered.includes("349 participants"));
    assert.ok(!recovered.includes("000+ active users"));
    assert.match(SECTION_BLEED_RAW_CV, /1,349/);
    assert.match(SECTION_BLEED_RAW_CV, /3,000\+/);
  });

  it("canonicalization does not pull project text into coursework", () => {
    const cv = canonicalizeCv(extractedBleedSource(), SECTION_BLEED_RAW_CV);
    const courses = cv.education[0].coursework.map((c) => c.text);
    assert.deepEqual(courses.sort(), [...VALID_BLEED_COURSES].sort());
    assert.equal(cv.projects[0].name, "HackerRank Orchestrate 2026");
    assert.match(cv.projects[0].description, /1,349/);
    assert.match(cv.projects[1].description, /3,000\+/);
  });

  it("rejects contaminated coursework with the required error codes", () => {
    const cv = canonicalizeCv(contaminatedReviewedSource(), SECTION_BLEED_RAW_CV);
    const report = validateSectionIntegrity(cv);
    assert.equal(report.valid, false);
    const codes = new Set(report.issues.map((issue) => issue.code));
    assert.ok(codes.has("COURSEWORK_SECTION_BLEED"));
    assert.ok(codes.has("COURSEWORK_CONTAINS_PROJECT"));
    assert.ok(codes.has("COURSEWORK_CONTAINS_DESCRIPTION") || codes.has("CROSS_SECTION_DUPLICATION"));
    assert.ok(codes.has("COURSEWORK_CONTAINS_TECHNOLOGIES"));
    assert.ok(codes.has("BROKEN_NUMERIC_TOKEN"));
    assert.ok(codes.has("DUPLICATE_SECTION_LABEL") || codes.has("COURSEWORK_SECTION_BLEED"));
    assert.ok(codes.has("SUSPICIOUS_COURSEWORK_LENGTH") || report.issues.some((issue) => (issue.evidence ?? "").length > 40));
  });

  it("flags Diploma vs bachelor as a hard requirement and does not rewrite it", () => {
    const source = cleanBleedSourceCv();
    const hard = analyzeHardRequirements(source, AMAZON_SDE_JD);
    assert.equal(hard.education.status, "needs_verification");
    assert.equal(hard.education.severity, "high");
    assert.match(String(hard.education.candidateEvidence), /Diploma in Software Engineering/);
    assert.equal(hard.graduationWindow.status, "meets");
    assert.deepEqual(hard.programmingLanguage.candidateEvidence, ["Python", "Java", "TypeScript"]);
    assert.equal(hard.programmingLanguage.status, "meets");
    assert.equal(source.education[0].degree, "Diploma in Software Engineering");
  });

  it("keeps AWS, CI/CD, on-call, monitoring and fault-tolerance as missing", () => {
    const source = cleanBleedSourceCv();
    const { tailored } = mergeProtectedFromSource(source, emptyDelta());
    const score = scoreJobAlignment(source, tailored, AMAZON_SDE_JD, [], 0);
    const missing = score.missingKeywords.join(" ").toLowerCase();
    assert.match(missing, /aws/);
    assert.match(missing, /ci\/cd/);
    assert.match(missing, /on-call|on call/);
    assert.match(missing, /monitoring/);
    assert.match(missing, /fault/);
    assert.ok(!tailored.skills.flatMap((g) => g.skills.map((s) => s.name.toLowerCase())).includes("aws"));
  });

  it("rejects scope inflation such as APIs → distributed system", () => {
    const warning = assessUnsupportedScope(
      "Wrote tests for the campus booking APIs",
      "Owned a distributed system for campus booking",
      "b1",
    );
    assert.ok(warning);
    assert.equal(warning!.riskType, "scale_inflation");
  });

  it("blocks PDF generation when section integrity fails", async () => {
    const source = canonicalizeCv(contaminatedReviewedSource(), SECTION_BLEED_RAW_CV);
    const { tailored } = mergeProtectedFromSource(source, emptyDelta());
    const wire = toTailoredWire(tailored, source, {
      matchScore: 10,
      scoreBreakdown: {
        keywordsMatch: 0,
        keywordsBefore: 0,
        skillsAlignment: 0,
        skillsBefore: 0,
        experienceRelevance: 0,
        experienceBefore: 0,
      },
      missingKeywords: [],
      addedKeywords: [],
      explanation: "",
    });
    assert.throws(() => assertRenderableCv(wire), SectionIntegrityError);
    await assert.rejects(() => renderResumePdfBytes(wire), SectionIntegrityError);
  });

  it("refunds the credit and does not persist when integrity fails", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", {
      id: "user-1",
      email: "alex@example.com",
      plan: "free",
      tailor_count: 0,
      tailor_reset_date: "2026-10-01T00:00:00Z",
    } satisfies UserCredits]]));
    let persisted = false;
    const completeJson: CompleteJsonFn = async () => ok(emptyDelta());
    const result = await executeTailorRequest({
      user: { id: "user-1", email: "alex@example.com" },
      isAdmin: false,
      jobDescription: AMAZON_SDE_JD,
      requestId: "req-bleed",
      reviewedSource: contaminatedReviewedSource(),
      cvText: SECTION_BLEED_RAW_CV,
      extractionConfirmed: true,
      completeJson,
      creditStore: store,
      persist: async () => {
        persisted = true;
        return {};
      },
      loadCredits: async () => store.users.get("user-1") ?? null,
    });
    assert.equal(result.status, 422);
    assert.equal(result.body.error, "SECTION_INTEGRITY_FAILED");
    assert.equal(persisted, false);
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
    assert.ok(Array.isArray(result.body.affectedSections));
  });

  it("keeps all source bullets in canonical data while displaying a subset", () => {
    const source = cleanBleedSourceCv();
    const selection = recommendDisplaySelection(source, AMAZON_SDE_JD);
    const shown = selection.experienceBulletIds[source.experience[0].id] ?? [];
    assert.ok(shown.length >= 2 && shown.length <= 6);
    assert.ok(shown.length < source.experience[0].sourceBullets.length);
    assert.equal(source.experience[0].sourceBullets.length, 8);
    assert.ok(selection.projectIds.length >= 2 && selection.projectIds.length <= 3);
    const { tailored } = mergeProtectedFromSource(source, emptyDelta());
    const wire = toTailoredWire(source, source, {
      matchScore: 20,
      scoreBreakdown: {
        keywordsMatch: 0,
        keywordsBefore: 0,
        skillsAlignment: 0,
        skillsBefore: 0,
        experienceRelevance: 0,
        experienceBefore: 0,
      },
      missingKeywords: [],
      addedKeywords: [],
      explanation: "",
    }, { displaySelection: selection });
    assert.ok((wire.experience[0].bullets?.length ?? 0) <= 6);
    assert.equal(wire.originalCV?.experience[0].sourceBullets?.length, 8);
    assert.equal(tailored.experience[0].sourceBullets.length, 8);
  });
});
