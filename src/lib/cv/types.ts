export const EXTRACT_PROMPT_VERSION = "extract-v3";
export const TAILOR_PROMPT_VERSION = "tailor-v2";
export const PRIMARY_TAILOR_MODEL = "gpt-5.1";
export const FALLBACK_TAILOR_MODEL = "gpt-5-mini";

export interface SourceBullet {
  id: string;
  text: string;
}

export interface BulletEvidence {
  id: string;
  sourceBulletIds: string[];
  originalText: string;
  tailoredText: string;
  matchedKeywords: string[];
}

export interface CanonicalCoursework {
  id: string;
  text: string;
}

export interface CanonicalExperience {
  id: string;
  title: string;
  company: string;
  dates: string;
  location: string;
  bullets: string[];
  sourceBullets: SourceBullet[];
  bulletEvidence: BulletEvidence[];
}

export interface CanonicalEducation {
  id: string;
  degree: string;
  institution: string;
  dates: string;
  location: string;
  coursework: CanonicalCoursework[];
}

export interface CanonicalCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface CanonicalProject {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url: string;
  dates: string;
  bullets: string[];
  sourceBullets: SourceBullet[];
  bulletEvidence: BulletEvidence[];
}

export interface CanonicalSkillItem {
  id: string;
  name: string;
}

export interface CanonicalSkillGroup {
  id: string;
  category: string;
  skills: CanonicalSkillItem[];
}

export interface CanonicalContact {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
}

export interface CustomSectionItem {
  id: string;
  text: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface CanonicalCV {
  contact: CanonicalContact;
  summary: string;
  experience: CanonicalExperience[];
  education: CanonicalEducation[];
  certifications: CanonicalCertification[];
  projects: CanonicalProject[];
  skills: CanonicalSkillGroup[];
  customSections: CustomSection[];
}

export type ClaimRiskType =
  | "ownership_inflation"
  | "leadership_inflation"
  | "proficiency_inflation"
  | "autonomy_inflation"
  | "scale_inflation"
  | "causality_inflation";

export interface ClaimStrengthWarning {
  sourceBulletId: string;
  originalText: string;
  tailoredText: string;
  riskType: ClaimRiskType;
  severity: "high" | "medium";
  reason: string;
}

export interface ExtractionReport {
  rawTextLength: number;
  detectedSectionHeadings: string[];
  canonicalSectionNames: string[];
  detectedCourseworkLines: number;
  canonicalCourseworkCount: number;
  warnings: string[];
  requiresUserReview: boolean;
  highConfidence: boolean;
  isLikelyImageOnly: boolean;
}

export type KeywordStatus =
  | "evidenced_and_used"
  | "evidenced_but_not_used"
  | "related_but_not_equivalent"
  | "not_evidenced";

export interface KeywordClassification {
  keyword: string;
  status: KeywordStatus;
}

export interface TailorDeltaBullet {
  sourceBulletIds: string[];
  tailoredText: string;
  matchedKeywords: string[];
}

export interface TailorDeltaExperience {
  id: string;
  bullets: TailorDeltaBullet[];
}

export interface TailorDeltaProject {
  id: string;
  description: string;
}

export interface TailorDeltaSkillOrder {
  categoryId: string;
  skillIds: string[];
}

export interface TailorDelta {
  summary: string;
  experience: TailorDeltaExperience[];
  projects: TailorDeltaProject[];
  skillOrder: TailorDeltaSkillOrder[];
  keywordClassifications: KeywordClassification[];
  missingKeywords: string[];
  assumptions: string[];
  conflicts: string[];
}

export interface PreservationReport {
  valid: boolean;
  missingIds: string[];
  changedProtectedFields: string[];
  unsupportedClaims: string[];
  duplicateIds: string[];
  warnings: string[];
  claimStrengthWarnings: ClaimStrengthWarning[];
}

export interface AlignmentScore {
  matchScore: number;
  scoreBreakdown: {
    keywordsMatch: number;
    keywordsBefore: number;
    skillsAlignment: number;
    skillsBefore: number;
    experienceRelevance: number;
    experienceBefore: number;
  };
  missingKeywords: string[];
  addedKeywords: string[];
  explanation: string;
}

export interface ModelCallMeta {
  promptVersion: string;
  model: string;
  finishReason: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  retryCount: number;
}

export interface TailorPipelineResult {
  source: CanonicalCV;
  tailored: CanonicalCV;
  report: PreservationReport;
  score: AlignmentScore;
  delta: TailorDelta;
  extractionReport?: ExtractionReport;
  hardRequirements?: import("./hardRequirements").HardRequirements;
  displaySelection?: import("./displaySelection").DisplaySelection;
  sectionIntegrity?: import("./sectionIntegrity").SectionIntegrityReport;
  meta: {
    extract?: ModelCallMeta;
    tailor: ModelCallMeta;
    repairAttempts: number;
    validationValid: boolean;
    missingItemCounts: Record<string, number>;
    usedFallback: boolean;
    claimStrengthWarningCount: number;
    customSectionCount: number;
    extractionWarningCount: number;
    repairSucceeded: boolean;
    creditStatus?: string;
  };
}

export type CompleteJsonPurpose = "extract" | "tailor" | "repair";

export interface CompleteJsonRequest {
  purpose: CompleteJsonPurpose;
  system?: string;
  user: string;
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  promptVersion: string;
}

export interface CompleteJsonResponse {
  parsed: unknown;
  raw: string;
  model: string;
  finishReason: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  retryCount: number;
  promptVersion: string;
}

export type CompleteJsonFn = (req: CompleteJsonRequest) => Promise<CompleteJsonResponse>;

export class IncompleteModelOutputError extends Error {
  constructor(
    message: string,
    readonly finishReason: string,
    readonly model: string,
  ) {
    super(message);
    this.name = "IncompleteModelOutputError";
  }
}

export class ModelJsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelJsonParseError";
  }
}

export class PreservationFailureError extends Error {
  constructor(
    message: string,
    readonly report: PreservationReport,
  ) {
    super(message);
    this.name = "PreservationFailureError";
  }
}

export class ExtractionReviewRequiredError extends Error {
  constructor(
    message: string,
    readonly report: ExtractionReport,
    readonly source: CanonicalCV,
  ) {
    super(message);
    this.name = "ExtractionReviewRequiredError";
  }
}

export class ExtractionFailedError extends Error {
  constructor(
    message: string,
    readonly report: ExtractionReport,
  ) {
    super(message);
    this.name = "ExtractionFailedError";
  }
}
