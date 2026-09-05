export const USER_ERROR_EXTRACTION =
  "We could not safely read every section of this CV. Please upload a clearer PDF or DOCX. No credit was used.";

export const USER_ERROR_IMAGE_ONLY =
  "We could not read selectable text from this file. Please upload a text-based PDF or DOCX. No credit was used.";

export const USER_ERROR_SECTION_BLEED =
  "We found content from another section inside Education or Coursework. Please correct the source CV and upload it again. No credit was used.";

export const USER_ERROR_GENERIC =
  "We could not tailor this CV. Please try again. No credit was used.";

export const USER_ERROR_TIMEOUT =
  "The request took too long and was stopped. Please try again. No credit was used.";

export const USER_ERROR_AI_UNAVAILABLE =
  "The AI service is temporarily unavailable. Please try again later. No credit was used.";

const BLEED_CODES = new Set(["COURSEWORK_SECTION_BLEED", "CROSS_SECTION_DUPLICATION"]);

export function userMessageForIntegrityIssues(
  issues: Array<{ code: string }> | undefined,
): string {
  if (issues?.some((issue) => BLEED_CODES.has(issue.code))) {
    return USER_ERROR_SECTION_BLEED;
  }
  return USER_ERROR_EXTRACTION;
}

export function userMessageForErrorCode(
  code: string | undefined,
  issues?: Array<{ code: string }>,
): string {
  if (code === "EXTRACTION_FAILED") return USER_ERROR_IMAGE_ONLY;
  if (code === "OPENAI_QUOTA_EXCEEDED" || code === "OPENAI_UNAVAILABLE") return USER_ERROR_AI_UNAVAILABLE;
  if (
    code === "EXTRACTION_INTEGRITY_FAILED" ||
    code === "SECTION_INTEGRITY_FAILED" ||
    code === "COURSEWORK_SECTION_BLEED" ||
    code === "CROSS_SECTION_DUPLICATION"
  ) {
    return userMessageForIntegrityIssues(issues);
  }
  return USER_ERROR_GENERIC;
}
