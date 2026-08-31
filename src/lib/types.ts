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

export interface Experience {
  id?: string;
  title: string;
  company: string;
  dates: string;
  bullets: string[];
  sourceBullets?: SourceBullet[];
  bulletEvidence?: BulletEvidence[];
}

export interface Education {
  id?: string;
  degree: string;
  institution: string;
  dates: string;
  coursework?: string[];
  courseworkIds?: string[];
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  id?: string;
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
  dates?: string;
  bulletEvidence?: BulletEvidence[];
}

export interface Reference {
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
}

export interface SkillCategory {
  id?: string;
  category: string;
  skills: string[];
  skillIds?: string[];
}

export interface KeywordClassification {
  keyword: string;
  status: "evidenced_and_used" | "evidenced_but_not_used" | "related_but_not_equivalent" | "not_evidenced";
}

export interface ClaimStrengthWarning {
  sourceBulletId: string;
  originalText: string;
  tailoredText: string;
  riskType: string;
  severity: "high" | "medium";
  reason: string;
}

export interface PreservationReport {
  valid: boolean;
  missingIds: string[];
  changedProtectedFields: string[];
  unsupportedClaims: string[];
  duplicateIds: string[];
  warnings: string[];
  claimStrengthWarnings?: ClaimStrengthWarning[];
}

export interface ScoreBreakdown {
  keywordsMatch: number;
  keywordsBefore: number;
  skillsAlignment: number;
  skillsBefore: number;
  experienceRelevance: number;
  experienceBefore: number;
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

export interface OriginalCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  skills: SkillCategory[];
  customSections?: CustomSection[];
}

export interface CVMeta {
  fileName: string;
  primaryRole: string;
  jobDescriptionPreview: string;
}

export interface TailoredCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  skills: SkillCategory[];
  references?: Reference[];
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  originalCV?: OriginalCV;
  meta?: CVMeta;
  addedKeywords?: string[];
  missingKeywords?: string[];
  assumptions?: string[];
  conflicts?: string[];
  keywordClassifications?: KeywordClassification[];
  preservation?: PreservationReport;
  customSections?: CustomSection[];
  modelUsed?: string;
  promptVersion?: string;
  hardRequirements?: import("./cv/hardRequirements").HardRequirements;
  displaySelection?: import("./cv/displaySelection").DisplaySelection;
  sectionIntegrity?: import("./cv/sectionIntegrity").SectionIntegrityReport;
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface UserCredits {
  id: string;
  email: string;
  plan: "free" | "pro" | "expired";
  tailor_count: number;
  tailor_reset_date: string;
}
