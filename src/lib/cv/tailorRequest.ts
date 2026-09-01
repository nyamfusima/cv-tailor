import { canonicalizeCv } from "./canonical";
import type { CreditStore } from "./credits";
import { logTailorTelemetry } from "./openai";
import { extractSourceCv, runTailorPipeline } from "./pipeline";
import { toOriginalWire, toTailoredWire } from "./wire";
import { ExtractionIntegrityError, SectionIntegrityError } from "./sectionIntegrity";
import {
  ExtractionFailedError,
  ExtractionReviewRequiredError,
  IncompleteModelOutputError,
  ModelJsonParseError,
  PreservationFailureError,
  TAILOR_PROMPT_VERSION,
  type CompleteJsonFn,
} from "./types";
import {
  USER_ERROR_EXTRACTION,
  USER_ERROR_GENERIC,
  USER_ERROR_IMAGE_ONLY,
  userMessageForIntegrityIssues,
} from "./userFacingErrors";
import type { UserCredits } from "../types";

export async function executeExtractRequest(input: {
  cvText: string;
  isLikelyImageOnly?: boolean;
  completeJson: CompleteJsonFn;
}) {
  const { source, report, extract } = await extractSourceCv({
    cvText: input.cvText,
    completeJson: input.completeJson,
    isLikelyImageOnly: input.isLikelyImageOnly,
  });
  logTailorTelemetry({
    promptVersion: extract.promptVersion,
    model: extract.model,
    purpose: "extract",
    finishReason: extract.finishReason,
    promptTokens: extract.promptTokens,
    completionTokens: extract.completionTokens,
    latencyMs: extract.latencyMs,
    retryCount: extract.retryCount,
    extractionWarningCount: report.warnings.length,
    customSectionCount: source.customSections.length,
  });
  return {
    source: toOriginalWire(source),
    canonical: source,
    extractionReport: report,
  };
}

export async function executeTailorRequest(input: {
  user: { id: string; email?: string | null };
  isAdmin: boolean;
  jobDescription: string;
  requestId: string;
  reviewedSource?: unknown;
  cvText?: string;
  isLikelyImageOnly?: boolean;
  extractionConfirmed?: boolean;
  fileName?: string;
  completeJson: CompleteJsonFn;
  creditStore: CreditStore;
  persist: (payload: unknown) => Promise<{ error?: { message: string } | null }>;
  loadCredits: () => Promise<UserCredits | null>;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  let reserved = false;
  const refund = async () => {
    if (!reserved || input.isAdmin) return;
    await input.creditStore.refund(input.requestId);
  };

  try {
    if (!input.jobDescription) {
      return { status: 400, body: { error: "Missing CV file or job description." } };
    }

    if (!input.isAdmin) {
      const credits = await input.loadCredits();
      if (!credits || credits.plan === "expired") {
        return { status: 403, body: { error: "NO_CREDITS", message: "You have no tailor credits left. Buy more to continue." } };
      }
      const reservation = await input.creditStore.reserve(input.user.id, input.requestId, credits);
      if (!reservation.ok) {
        return { status: 403, body: { error: "NO_CREDITS", message: "You have no tailor credits left. Buy more to continue." } };
      }
      reserved = reservation.status === "reserved" || reservation.idempotent === true;
      if (reservation.status === "consumed") {
        return { status: 409, body: { error: "REQUEST_ALREADY_COMPLETED", message: "This request was already completed." } };
      }
    }

    const source = input.reviewedSource ? canonicalizeCv(input.reviewedSource, input.cvText ?? "") : undefined;

    const result = await runTailorPipeline({
      cvText: input.cvText,
      source,
      jobDescription: input.jobDescription,
      completeJson: input.completeJson,
      isLikelyImageOnly: input.isLikelyImageOnly,
    });

    const tailored = toTailoredWire(result.tailored, result.source, result.score, {
      delta: result.delta,
      report: result.report,
      modelUsed: result.meta.tailor.model,
      promptVersion: TAILOR_PROMPT_VERSION,
      fileName: input.fileName || "upload",
      jobDescriptionPreview: input.jobDescription.slice(0, 200),
      hardRequirements: result.hardRequirements,
      displaySelection: result.displaySelection,
      sectionIntegrity: result.sectionIntegrity,
      jobDescription: input.jobDescription,
    });

    const persist = await input.persist({
      user_id: input.user.id,
      user_email: input.user.email,
      cv_text: input.cvText ?? "",
      job_description: input.jobDescription,
      tailored_cv: tailored,
      match_score: tailored.matchScore || null,
    });

    if (persist.error) {
      await refund();
      logTailorTelemetry({
        promptVersion: TAILOR_PROMPT_VERSION,
        model: result.meta.tailor.model,
        purpose: "tailor",
        validationValid: true,
        creditStatus: "refunded_persist_failure",
        usedFallback: result.meta.usedFallback,
      });
      return { status: 500, body: { error: "DB_INSERT_FAILED", message: persist.error.message } };
    }

    if (!input.isAdmin) {
      let consumed = await input.creditStore.consume(input.requestId);
      if (!consumed.ok) {
        consumed = await input.creditStore.consume(input.requestId);
      }
      if (!consumed.ok) {
        logTailorTelemetry({
          promptVersion: TAILOR_PROMPT_VERSION,
          model: result.meta.tailor.model,
          purpose: "tailor",
          validationValid: true,
          creditStatus: "consume_failed",
          usedFallback: result.meta.usedFallback,
        });
        return {
          status: 500,
          body: { error: "CREDIT_CONSUME_FAILED", userMessage: USER_ERROR_GENERIC },
        };
      }
    }

    logTailorTelemetry({
      promptVersion: TAILOR_PROMPT_VERSION,
      model: result.meta.tailor.model,
      purpose: "tailor",
      usedFallback: result.meta.usedFallback,
      validationValid: true,
      creditStatus: input.isAdmin ? "skipped_admin" : "consumed",
      claimStrengthWarningCount: result.meta.claimStrengthWarningCount,
      customSectionCount: result.meta.customSectionCount,
      extractionWarningCount: result.meta.extractionWarningCount,
      repairAttempts: result.meta.repairAttempts,
      repairSucceeded: result.meta.repairSucceeded,
      latencyMs: result.meta.tailor.latencyMs,
    });

    return { status: 200, body: tailored as unknown as Record<string, unknown> };
  } catch (err) {
    await refund();
    if (err instanceof SectionIntegrityError) {
      const userMessage = userMessageForIntegrityIssues(err.report.issues);
      return {
        status: 422,
        body: {
          error: "SECTION_INTEGRITY_FAILED",
          userMessage,
          issues: err.report.issues,
          affectedSections: [...new Set(err.report.issues.map((issue) => issue.section))],
        },
      };
    }
    if (err instanceof ExtractionIntegrityError) {
      return {
        status: 422,
        body: {
          error: "EXTRACTION_INTEGRITY_FAILED",
          userMessage: userMessageForIntegrityIssues(err.report.issues),
          issues: err.report.issues,
        },
      };
    }
    if (err instanceof ExtractionReviewRequiredError) {
      return {
        status: 422,
        body: {
          error: "EXTRACTION_INTEGRITY_FAILED",
          userMessage: USER_ERROR_EXTRACTION,
        },
      };
    }
    if (err instanceof ExtractionFailedError) {
      return {
        status: 422,
        body: {
          error: "EXTRACTION_FAILED",
          userMessage: USER_ERROR_IMAGE_ONLY,
        },
      };
    }
    if (err instanceof PreservationFailureError) {
      return { status: 422, body: { error: "PRESERVATION_FAILED", userMessage: USER_ERROR_GENERIC } };
    }
    if (err instanceof IncompleteModelOutputError || err instanceof ModelJsonParseError) {
      console.error("Tailor model output failed", err);
      return { status: 502, body: { error: "INCOMPLETE_MODEL_OUTPUT", userMessage: USER_ERROR_GENERIC } };
    }
    console.error("Tailor request failed", err);
    return { status: 500, body: { error: "TAILOR_FAILED", userMessage: USER_ERROR_GENERIC } };
  }
}
