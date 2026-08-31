import { canonicalizeCv } from "./canonical";
import { buildExtractionReport } from "./extractionReport";
import { scoreJobAlignment } from "./matchScore";
import { coerceDelta, emptyDelta, mergeProtectedFromSource, restoreMissingFromSource } from "./mergeProtected";
import { logTailorTelemetry } from "./openai";
import {
  buildExtractPrompt,
  buildRepairPrompt,
  buildTailorPrompt,
  EXTRACT_PROMPT_VERSION,
  TAILOR_PROMPT_VERSION,
  tailorSystemPrompt,
} from "./prompts";
import { EXTRACT_JSON_SCHEMA, REPAIR_DELTA_JSON_SCHEMA, TAILOR_DELTA_JSON_SCHEMA } from "./schema";
import {
  ExtractionFailedError,
  ExtractionReviewRequiredError,
  IncompleteModelOutputError,
  ModelJsonParseError,
  PreservationFailureError,
  type CanonicalCV,
  type CompleteJsonFn,
  type ExtractionReport,
  type ModelCallMeta,
  type TailorPipelineResult,
} from "./types";
import { missingItemCounts, validatePreservation } from "./validatePreservation";

function toMeta(
  response: { model: string; finishReason: string; promptTokens?: number; completionTokens?: number; latencyMs: number; retryCount: number },
  promptVersion: string,
): ModelCallMeta {
  return {
    promptVersion,
    model: response.model,
    finishReason: response.finishReason,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    latencyMs: response.latencyMs,
    retryCount: response.retryCount,
  };
}

export async function extractSourceCv(input: {
  cvText: string;
  completeJson: CompleteJsonFn;
  isLikelyImageOnly?: boolean;
}): Promise<{ source: CanonicalCV; report: ExtractionReport; extract: ModelCallMeta }> {
  if (input.isLikelyImageOnly || input.cvText.trim().length < 80) {
    const empty = canonicalizeCv({}, input.cvText);
    const report = buildExtractionReport({
      cvText: input.cvText,
      source: empty,
      isLikelyImageOnly: true,
    });
    throw new ExtractionFailedError(
      "We could not read enough text from this file. It may be a scanned or image-only PDF.",
      report,
    );
  }

  const extractRes = await input.completeJson({
    purpose: "extract",
    user: buildExtractPrompt(input.cvText),
    jsonSchema: EXTRACT_JSON_SCHEMA,
    maxOutputTokens: 16384,
    promptVersion: EXTRACT_PROMPT_VERSION,
  });

  const source = canonicalizeCv(extractRes.parsed, input.cvText);
  const report = buildExtractionReport({
    cvText: input.cvText,
    source,
    isLikelyImageOnly: input.isLikelyImageOnly,
    extractIncomplete: extractRes.finishReason === "length" || extractRes.finishReason === "incomplete",
  });

  return { source, report, extract: toMeta(extractRes, EXTRACT_PROMPT_VERSION) };
}

export async function runTailorPipeline(input: {
  cvText?: string;
  source?: CanonicalCV;
  jobDescription: string;
  completeJson: CompleteJsonFn;
  extractionConfirmed?: boolean;
  isLikelyImageOnly?: boolean;
}): Promise<TailorPipelineResult> {
  let source = input.source;
  let extractMeta: ModelCallMeta | undefined;
  let extractionReport: ExtractionReport | undefined;

  if (!source) {
    const extracted = await extractSourceCv({
      cvText: input.cvText ?? "",
      completeJson: input.completeJson,
      isLikelyImageOnly: input.isLikelyImageOnly,
    });
    source = extracted.source;
    extractMeta = extracted.extract;
    extractionReport = extracted.report;
    if (extracted.report.highConfidence && !input.extractionConfirmed) {
      throw new ExtractionReviewRequiredError(
        "Please review the extracted CV. Some source sections may be missing.",
        extracted.report,
        extracted.source,
      );
    }
  } else if (input.cvText) {
    extractionReport = buildExtractionReport({
      cvText: input.cvText,
      source,
      isLikelyImageOnly: input.isLikelyImageOnly,
    });
  }

  const tailorRes = await input.completeJson({
    purpose: "tailor",
    system: tailorSystemPrompt(),
    user: buildTailorPrompt(source, input.jobDescription),
    jsonSchema: TAILOR_DELTA_JSON_SCHEMA,
    maxOutputTokens: 8192,
    promptVersion: TAILOR_PROMPT_VERSION,
  });

  let { tailored, delta, claimStrengthWarnings } = mergeProtectedFromSource(source, coerceDelta(tailorRes.parsed));
  let report = validatePreservation(source, tailored);
  report = { ...report, claimStrengthWarnings };
  let repairAttempts = 0;
  let repairSucceeded = false;

  if (!report.valid) {
    tailored = restoreMissingFromSource(source, tailored);
    report = { ...validatePreservation(source, tailored), claimStrengthWarnings };
  }

  if (!report.valid) {
    repairAttempts = 1;
    try {
      const repairRes = await input.completeJson({
        purpose: "repair",
        system: tailorSystemPrompt(),
        user: buildRepairPrompt(source, input.jobDescription, delta, [
          ...report.missingIds.map((id) => `missing:${id}`),
          ...report.changedProtectedFields.map((f) => `changed:${f}`),
          ...report.unsupportedClaims.map((c) => `unsupported:${c}`),
        ]),
        jsonSchema: REPAIR_DELTA_JSON_SCHEMA,
        maxOutputTokens: 4096,
        promptVersion: TAILOR_PROMPT_VERSION,
      });
      const repaired = mergeProtectedFromSource(source, coerceDelta(repairRes.parsed));
      tailored = restoreMissingFromSource(source, repaired.tailored);
      delta = repaired.delta;
      claimStrengthWarnings = [...claimStrengthWarnings, ...repaired.claimStrengthWarnings];
      report = { ...validatePreservation(source, tailored), claimStrengthWarnings };
      repairSucceeded = report.valid;
    } catch (err) {
      if (err instanceof IncompleteModelOutputError || err instanceof ModelJsonParseError) {
        tailored = restoreMissingFromSource(source, tailored);
        report = { ...validatePreservation(source, tailored), claimStrengthWarnings };
        repairSucceeded = report.valid;
      } else {
        throw err;
      }
    }
  }

  const usedFallback = tailorRes.model !== (process.env.OPENAI_TAILOR_MODEL || "gpt-5.1");

  if (!report.valid) {
    logTailorTelemetry({
      promptVersion: TAILOR_PROMPT_VERSION,
      model: tailorRes.model,
      purpose: "tailor",
      finishReason: tailorRes.finishReason,
      promptTokens: tailorRes.promptTokens,
      completionTokens: tailorRes.completionTokens,
      validationValid: false,
      retryCount: tailorRes.retryCount,
      missingItemCounts: missingItemCounts(report),
      latencyMs: (extractMeta?.latencyMs ?? 0) + tailorRes.latencyMs,
      repairAttempts,
      usedFallback,
      claimStrengthWarningCount: claimStrengthWarnings.length,
      customSectionCount: source.customSections.length,
      extractionWarningCount: extractionReport?.warnings.length ?? 0,
      repairSucceeded,
    });
    throw new PreservationFailureError(
      "Tailoring could not preserve every source CV item. No credit was used.",
      report,
    );
  }

  const score = scoreJobAlignment(
    source,
    tailored,
    input.jobDescription,
    delta.keywordClassifications,
    report.unsupportedClaims.length,
  );

  logTailorTelemetry({
    promptVersion: TAILOR_PROMPT_VERSION,
    model: tailorRes.model,
    purpose: "tailor",
    finishReason: tailorRes.finishReason,
    promptTokens: tailorRes.promptTokens,
    completionTokens: tailorRes.completionTokens,
    validationValid: true,
    retryCount: tailorRes.retryCount,
    missingItemCounts: missingItemCounts(report),
    latencyMs: (extractMeta?.latencyMs ?? 0) + tailorRes.latencyMs,
    repairAttempts,
    usedFallback,
    claimStrengthWarningCount: claimStrengthWarnings.length,
    customSectionCount: source.customSections.length,
    extractionWarningCount: extractionReport?.warnings.length ?? 0,
    repairSucceeded,
  });

  return {
    source,
    tailored,
    report,
    score,
    delta,
    extractionReport,
    meta: {
      extract: extractMeta,
      tailor: toMeta(tailorRes, TAILOR_PROMPT_VERSION),
      repairAttempts,
      validationValid: report.valid,
      missingItemCounts: missingItemCounts(report),
      usedFallback,
      claimStrengthWarningCount: claimStrengthWarnings.length,
      customSectionCount: source.customSections.length,
      extractionWarningCount: extractionReport?.warnings.length ?? 0,
      repairSucceeded,
    },
  };
}

export { emptyDelta };
