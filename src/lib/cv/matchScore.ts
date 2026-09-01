import { normalizeKey } from "./json";
import { evidencedSkillCorpus, extractJobSkillTerms } from "./skillPromotion";
import type { AlignmentScore, CanonicalCV, KeywordClassification } from "./types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "was", "were", "this",
  "that", "from", "have", "has", "will", "can", "not", "but", "all", "any", "per",
  "job", "role", "team", "work", "working", "ability", "skills", "experience",
  "including", "across", "into", "about", "other", "such", "using", "within",
  "must", "should", "please", "who", "what", "when", "where", "which", "their",
  "they", "them", "been", "also", "more", "than", "over", "under",
  "required", "preferred", "requirement", "requirements", "qualification",
  "qualifications", "responsibilities", "responsibility", "candidate", "candidates",
  "position", "opportunity", "description", "looking", "seeking", "join", "apply",
  "application", "company", "successful", "excellent", "strong", "proven",
  "knowledge", "understanding", "environment", "environments", "minimum",
  "plus", "etc", "ensure", "ensuring", "provide", "develop", "developing",
  "build", "building", "own", "tune", "well", "able", "highly", "driven",
  "senior", "junior", "mid", "level", "lead", "staff", "principal",
  "budgets", "budget", "latency",
]);

const ROLE_TOKENS = [
  "engineer", "developer", "software", "intern", "analyst", "scientist",
  "designer", "administrator", "coordinator", "operations", "backend",
  "frontend", "fullstack", "data", "ai", "ml",
];

export const UNSUPPORTED_JD_KEYWORDS = [
  "aws",
  "ci/cd",
  "cicd",
  "on-call",
  "on call",
  "monitoring",
  "fault tolerance",
  "fault-tolerant",
  "fault-tolerance",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasToken(corpus: string, term: string): boolean {
  const needle = normalizeKey(term);
  if (!needle) return false;
  return new RegExp(`(?:^|[^a-z0-9+#])${escapeRegExp(needle)}(?=[^a-z0-9+#]|$)`, "i").test(corpus);
}

function forceUnsupportedMissing(jobDescription: string, sourceCorpus: string, missing: string[]): string[] {
  const extra: string[] = [];
  for (const term of UNSUPPORTED_JD_KEYWORDS) {
    if (hasToken(jobDescription, term) && !hasToken(sourceCorpus, term)) {
      extra.push(term === "cicd" ? "CI/CD" : term);
    }
  }
  return [...new Set([...missing, ...extra])];
}

function isPreferredOnly(jobDescription: string, term: string): boolean {
  const parts = jobDescription.split(/preferred\s*:/i);
  if (parts.length < 2) return false;
  const required = parts[0];
  const preferred = parts.slice(1).join(" ");
  return hasToken(preferred, term) && !hasToken(required, term);
}

function skillCoverage(terms: string[], corpus: string, jobDescription: string): number {
  if (terms.length === 0) return 0;
  const required = terms.filter((term) => !isPreferredOnly(jobDescription, term));
  const preferred = terms.filter((term) => isPreferredOnly(jobDescription, term));
  if (preferred.length === 0) return coverage(terms, corpus);
  const requiredScore = required.length ? coverage(required, corpus) : 100;
  const preferredScore = coverage(preferred, corpus);
  return Math.round(requiredScore * 0.85 + preferredScore * 0.15);
}

export function extractKeywords(jobDescription: string): string[] {
  const phrases = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const word of phrases) {
    if (seen.has(word)) continue;
    seen.add(word);
    unique.push(word);
    if (unique.length >= 24) break;
  }
  for (const term of extractJobSkillTerms(jobDescription)) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }
  return unique;
}

function atsTerms(jobDescription: string): string[] {
  const skillTerms = extractJobSkillTerms(jobDescription);
  const extras = extractKeywords(jobDescription)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word))
    .slice(0, 12);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [...skillTerms, ...extras]) {
    const key = normalizeKey(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  return out;
}

function cvCorpus(cv: CanonicalCV): string {
  return [
    cv.summary,
    ...cv.experience.flatMap((j) => [j.title, j.company, ...j.bullets]),
    ...cv.projects.flatMap((p) => [p.name, p.description, ...p.technologies]),
    ...cv.skills.flatMap((g) => g.skills.map((s) => s.name)),
    ...cv.education.flatMap((e) => [e.degree, e.institution, ...e.coursework.map((c) => c.text)]),
    ...cv.certifications.map((c) => c.name),
  ]
    .join(" ")
    .toLowerCase();
}

function skillScanCorpus(cv: CanonicalCV): string {
  return [
    evidencedSkillCorpus(cv),
    cv.summary,
    ...cv.experience.flatMap((job) => [job.title, ...job.bullets]),
    ...cv.projects.flatMap((project) => [project.description, ...project.technologies]),
  ]
    .join(" ")
    .toLowerCase();
}

function coverage(keywords: string[], corpus: string): number {
  if (keywords.length === 0) return 0;
  const hits = keywords.filter((k) => hasToken(corpus, k)).length;
  return Math.round((hits / keywords.length) * 100);
}

function titleAlignment(cv: CanonicalCV, jobDescription: string): number {
  const title = (cv.experience[0]?.title ?? "").toLowerCase();
  const jd = jobDescription.toLowerCase();
  if (!title) return 55;
  const words = title.split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const directHits = words.filter((w) => hasToken(jd, w)).length;
  const direct = words.length ? Math.round((directHits / words.length) * 100) : 55;
  const familyHits = ROLE_TOKENS.filter((token) => hasToken(title, token) && hasToken(jd, token)).length;
  const family = familyHits > 0 ? Math.min(85, 55 + familyHits * 15) : 45;
  return Math.max(direct, family);
}

function sectionCompleteness(cv: CanonicalCV): number {
  let score = 0;
  if (cv.experience.length) score += 40;
  if (cv.education.length) score += 20;
  if (cv.skills.length) score += 20;
  if (cv.summary.trim()) score += 10;
  if (cv.certifications.length || cv.projects.length) score += 10;
  return score;
}

function stuffingPenalty(cv: CanonicalCV, keywords: string[]): number {
  const corpus = cvCorpus(cv);
  let repeats = 0;
  for (const key of keywords) {
    const matches = corpus.split(normalizeKey(key)).length - 1;
    if (matches > 6) repeats += matches - 6;
  }
  return Math.min(20, repeats * 2);
}

function duplicatePenalty(cv: CanonicalCV): number {
  const bullets = cv.experience.flatMap((j) => j.bullets.map(normalizeKey)).filter(Boolean);
  const seen = new Set<string>();
  let dupes = 0;
  for (const b of bullets) {
    if (seen.has(b)) dupes++;
    else seen.add(b);
  }
  return Math.min(15, dupes * 5);
}

export function scoreJobAlignment(
  source: CanonicalCV,
  tailored: CanonicalCV,
  jobDescription: string,
  classifications: KeywordClassification[] = [],
  unsupportedClaimCount = 0,
): AlignmentScore {
  const skillTerms = extractJobSkillTerms(jobDescription);
  const terms = atsTerms(jobDescription);
  const sourceCorpus = cvCorpus(source);
  const tailoredCorpus = cvCorpus(tailored);
  const sourceSkills = skillScanCorpus(source);
  const tailoredSkills = skillScanCorpus(tailored);

  const keywordsBefore = coverage(terms, sourceCorpus);
  const keywordsMatch = coverage(terms, tailoredCorpus);

  const skillFocus = skillTerms.length ? skillTerms : terms;
  const skillsBefore = skillCoverage(skillFocus, sourceSkills, jobDescription);
  const skillsAlignment = skillCoverage(skillFocus, tailoredSkills, jobDescription);

  const experienceBefore = titleAlignment(source, jobDescription);
  const experienceRelevance = titleAlignment(tailored, jobDescription);

  const completeness = sectionCompleteness(tailored);
  const penalties =
    unsupportedClaimCount * 8 +
    stuffingPenalty(tailored, terms) +
    duplicatePenalty(tailored);

  const raw =
    skillsAlignment * 0.4 +
    keywordsMatch * 0.3 +
    experienceRelevance * 0.1 +
    completeness * 0.1 +
    Math.max(0, 100 - penalties) * 0.1;

  const matchScore = Math.max(0, Math.min(100, Math.round(raw)));

  const evidencedUsed = classifications
    .filter((c) => c.status === "evidenced_and_used")
    .map((c) => c.keyword);
  const missingKeywords = classifications
    .filter((c) => c.status === "not_evidenced")
    .map((c) => c.keyword);
  const inferredMissing =
    missingKeywords.length > 0
      ? missingKeywords
      : terms
          .filter((k) => !hasToken(tailoredCorpus, k) && !STOPWORDS.has(normalizeKey(k)))
          .slice(0, 12);

  const forcedMissing = forceUnsupportedMissing(jobDescription, sourceCorpus, inferredMissing);

  return {
    matchScore,
    scoreBreakdown: {
      keywordsMatch,
      keywordsBefore,
      skillsAlignment,
      skillsBefore,
      experienceRelevance,
      experienceBefore,
    },
    missingKeywords: forcedMissing,
    addedKeywords: evidencedUsed,
    explanation:
      "Estimated ATS-style alignment from evidenced job-skill coverage, keyword overlap, title fit, and section completeness. This is not an ATS-pass guarantee.",
  };
}
