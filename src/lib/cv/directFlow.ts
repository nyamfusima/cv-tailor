import { userMessageForErrorCode } from "./userFacingErrors";

export const AFTER_UPLOAD_ROUTE = "/loading-screen";
export const AFTER_FAILURE_ROUTE = "/upload";
export const RETIRED_REVIEW_ROUTE = "/review";

export interface PendingTailorPayload {
  cvBase64: string;
  cvName: string;
  cvType: string;
  jobDescription: string;
  requestId: string;
}

export function createPendingTailorPayload(input: {
  cvBase64: string;
  cvName: string;
  cvType: string;
  jobDescription: string;
  requestId?: string;
}): PendingTailorPayload {
  return {
    cvBase64: input.cvBase64,
    cvName: input.cvName,
    cvType: input.cvType,
    jobDescription: input.jobDescription,
    requestId: input.requestId || crypto.randomUUID(),
  };
}

const EXTRACTION_CODES = new Set([
  "EXTRACTION_FAILED",
  "EXTRACTION_INTEGRITY_FAILED",
  "SECTION_INTEGRITY_FAILED",
  "COURSEWORK_SECTION_BLEED",
  "CROSS_SECTION_DUPLICATION",
  "EXTRACTION_REVIEW_REQUIRED",
]);

export function isDirectFlowBlockingError(code: string | undefined): boolean {
  return Boolean(code && EXTRACTION_CODES.has(code));
}

export function userMessageFromTailorResponse(data: {
  error?: string;
  userMessage?: string;
  issues?: Array<{ code: string }>;
}): string {
  if (typeof data.userMessage === "string" && data.userMessage.trim()) {
    return data.userMessage;
  }
  return userMessageForErrorCode(data.error, data.issues);
}

export function annotateTailorErrorForAdmin(
  isAdmin: boolean,
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (!isAdmin) return body;
  const code = typeof body.error === "string" && body.error.trim() ? body.error : "TAILOR_FAILED";
  const base =
    typeof body.userMessage === "string" && body.userMessage.trim()
      ? body.userMessage
      : userMessageForErrorCode(typeof body.error === "string" ? body.error : undefined);
  if (base.includes(`(${code})`)) return body;
  return { ...body, userMessage: `${base} (${code})` };
}

export function shouldIgnoreLegacyReviewState(pending: {
  cvBase64?: string;
  jobDescription?: string;
  reviewedSource?: unknown;
}): boolean {
  if (!pending.jobDescription) return true;
  if (pending.reviewedSource && !pending.cvBase64) return true;
  return !pending.cvBase64;
}
