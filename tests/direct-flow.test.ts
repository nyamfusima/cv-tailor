import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { canonicalizeCv } from "../src/lib/cv/canonical";
import { createMemoryCreditStore } from "../src/lib/cv/credits";
import {
  AFTER_FAILURE_ROUTE,
  AFTER_UPLOAD_ROUTE,
  RETIRED_REVIEW_ROUTE,
  createPendingTailorPayload,
  isDirectFlowBlockingError,
  shouldIgnoreLegacyReviewState,
  userMessageFromTailorResponse,
} from "../src/lib/cv/directFlow";
import { executeTailorRequest } from "../src/lib/cv/tailorRequest";
import { USER_ERROR_EXTRACTION, USER_ERROR_IMAGE_ONLY, USER_ERROR_SECTION_BLEED } from "../src/lib/cv/userFacingErrors";
import type { CompleteJsonFn, CompleteJsonResponse } from "../src/lib/cv/types";
import type { UserCredits } from "../src/lib/types";
import { contaminatedReviewedSource, SECTION_BLEED_RAW_CV } from "./fixtures/section-bleed-cv";
import { harvardExtractedSource } from "./fixtures/harvard-cv";

function ok(parsed: unknown): CompleteJsonResponse {
  return {
    parsed,
    raw: JSON.stringify(parsed),
    model: "gpt-5.1",
    finishReason: "stop",
    promptTokens: 8,
    completionTokens: 8,
    latencyMs: 4,
    retryCount: 0,
    promptVersion: "test",
  };
}

function emptyDelta() {
  return {
    summary: "Software engineering graduate building AI and data tools.",
    experience: [],
    projects: [],
    skillOrder: [],
    keywordClassifications: [],
    missingKeywords: [],
    assumptions: [],
    conflicts: [],
  };
}

const credits = (): UserCredits => ({
  id: "user-1",
  email: "alex@example.com",
  plan: "free",
  tailor_count: 0,
  tailor_reset_date: "2026-10-01T00:00:00Z",
});

describe("direct tailor flow", () => {
  it("UploadForm does not navigate to /review and goes to loading-screen", () => {
    const upload = readFileSync(join(process.cwd(), "src/components/UploadForm.tsx"), "utf8");
    assert.doesNotMatch(upload, /router\.push\(["']\/review["']\)/);
    assert.match(upload, /AFTER_UPLOAD_ROUTE/);
    assert.equal(AFTER_UPLOAD_ROUTE, "/loading-screen");
    assert.doesNotMatch(upload, /reviewedSource|extractionConfirmed/);
  });

  it("createPendingTailorPayload stores only loading-route fields", () => {
    const payload = createPendingTailorPayload({
      cvBase64: "abc",
      cvName: "cv.pdf",
      cvType: "application/pdf",
      jobDescription: "Software intern",
      requestId: "req-1",
    });
    assert.deepEqual(Object.keys(payload).sort(), ["cvBase64", "cvName", "cvType", "jobDescription", "requestId"]);
    assert.equal("reviewedSource" in payload, false);
  });

  it("loading-screen calls the direct tailor pipeline", () => {
    const loading = readFileSync(join(process.cwd(), "src/app/loading-screen/page.tsx"), "utf8");
    assert.match(loading, /fetch\(["']\/api\/tailor["']/);
    assert.doesNotMatch(loading, /["']\/review["']/);
    assert.doesNotMatch(loading, /extractionConfirmed/);
    assert.doesNotMatch(loading, /fd\.append\(["']reviewedSource["']/);
  });

  it("/review redirects to upload", () => {
    const review = readFileSync(join(process.cwd(), "src/app/review/page.tsx"), "utf8");
    assert.match(review, /redirect\(/);
    assert.match(review, /AFTER_FAILURE_ROUTE/);
    assert.equal(AFTER_FAILURE_ROUTE, "/upload");
    assert.equal(RETIRED_REVIEW_ROUTE, "/review");
  });

  it("legacy review session data returns to upload", () => {
    assert.equal(shouldIgnoreLegacyReviewState({ reviewedSource: { name: "Alex" }, jobDescription: "JD" }), true);
    assert.equal(shouldIgnoreLegacyReviewState({ cvBase64: "abc", jobDescription: "JD" }), false);
  });

  it("no normal UI path requires reviewedSource", () => {
    const srcFiles = [
      "src/components/UploadForm.tsx",
      "src/app/loading-screen/page.tsx",
      "src/app/results/page.tsx",
      "src/app/review/page.tsx",
    ];
    for (const file of srcFiles) {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      assert.doesNotMatch(text, /extractionConfirmed:\s*true/);
      assert.doesNotMatch(text, /fd\.append\(["']reviewedSource["']/);
    }
  });

  it("valid extraction continues automatically without reviewedSource", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    let persistCount = 0;
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(harvardExtractedSource());
      return ok(emptyDelta());
    };
    const result = await executeTailorRequest({
      user: { id: "user-1", email: "alex@example.com" },
      isAdmin: false,
      jobDescription: "Software intern using Python and TypeScript",
      requestId: "req-direct",
      cvText: "ALEX CANDIDATE\nDiploma in Software Engineering\nRelevant coursework: Generative AI, Python",
      completeJson,
      creditStore: store,
      persist: async () => {
        persistCount += 1;
        return {};
      },
      loadCredits: async () => store.users.get("user-1") ?? null,
    });
    assert.equal(result.status, 200);
    assert.equal(persistCount, 1);
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
    assert.equal(result.body.name, "Alex Candidate");
  });

  it("invalid extraction returns to upload semantics and uses no credit", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    let persisted = false;
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(contaminatedReviewedSource());
      return ok(emptyDelta());
    };
    const result = await executeTailorRequest({
      user: { id: "user-1", email: "alex@example.com" },
      isAdmin: false,
      jobDescription: "Software intern",
      requestId: "req-extract-fail",
      cvText: SECTION_BLEED_RAW_CV,
      completeJson,
      creditStore: store,
      persist: async () => {
        persisted = true;
        return {};
      },
      loadCredits: async () => store.users.get("user-1") ?? null,
    });
    assert.equal(result.status, 422);
    assert.ok(["EXTRACTION_INTEGRITY_FAILED", "SECTION_INTEGRITY_FAILED"].includes(String(result.body.error)));
    assert.equal(persisted, false);
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
    assert.match(String(result.body.userMessage), /No credit was used/);
    assert.equal(isDirectFlowBlockingError(String(result.body.error)), true);
  });

  it("maps integrity failures to user-safe upload messages", () => {
    assert.equal(
      userMessageFromTailorResponse({ error: "EXTRACTION_FAILED" }),
      USER_ERROR_IMAGE_ONLY,
    );
    assert.equal(
      userMessageFromTailorResponse({
        error: "SECTION_INTEGRITY_FAILED",
        issues: [{ code: "COURSEWORK_SECTION_BLEED" }],
      }),
      USER_ERROR_SECTION_BLEED,
    );
    assert.equal(
      userMessageFromTailorResponse({ error: "EXTRACTION_INTEGRITY_FAILED" }),
      USER_ERROR_EXTRACTION,
    );
  });

  it("does not store empty Relevant areas: as coursework", () => {
    const source = canonicalizeCv(harvardExtractedSource());
    const coursework = source.education[0].coursework.map((item) => item.text);
    assert.ok(!coursework.some((item) => /relevant areas/i.test(item)));
    assert.ok(coursework.includes("Generative AI"));
  });
});
