import { normalizeKey } from "./json";
import type { AlignmentScore, CanonicalCV, KeywordClassification } from "./types";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "was", "were", "this",
  "that", "from", "have", "has", "will", "can", "not", "but", "all", "any", "per",
  "job", "role", "team", "work", "working", "ability", "skills", "experience",
  "including", "across", "into", "about", "other", "such", "using", "within",
  "must", "should", "please", "who", "what", "when", "where", "which", "their",
  "they", "them", "been", "also", "more", "than", "over", "under",
]);

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

function forceUnsupportedMissing(jobDescription: string, sourceCorpus: string, missing: string[]): string[] {
  const jd = jobDescription.toLowerCase();
  const extra: string[] = [];
  for (const term of UNSUPPORTED_JD_KEYWORDS) {
    if (jd.includes(term) && !sourceCorpus.includes(term)) {
      extra.push(term === "cicd" ? "CI/CD" : term);
    }
  }
  return [...new Set([...missing, ...extra])];
}

export function extractKeywords(jobDescription: string): string[] {
  const phrases = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const word of phrases) {
    if (seen.has(word)) continue;
    seen.add(word);
    unique.push(word);
    if (unique.length >= 40) break;
  }
  return unique;
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

function coverage(keywords: string[], corpus: string): number {
  if (keywords.length === 0) return 0;
  const hits = keywords.filter((k) => corpus.includes(k)).length;
  return Math.round((hits / keywords.length) * 100);
}

function skillNames(cv: CanonicalCV): string[] {
  return cv.skills.flatMap((g) => g.skills.map((s) => normalizeKey(s.name)));
}

function titleAlignment(cv: CanonicalCV, jobDescription: string): number {
  const title = cv.experience[0]?.title ?? "";
  if (!title) return 40;
  const jd = jobDescription.toLowerCase();
  const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (words.length === 0) return 40;
  const hits = words.filter((w) => jd.includes(w)).length;
  return Math.round((hits / words.length) * 100);
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
    const matches = corpus.split(key).length - 1;
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
  const keywords = extractKeywords(jobDescription);
  const sourceCorpus = cvCorpus(source);
  const tailoredCorpus = cvCorpus(tailored);

  const keywordsBefore = coverage(keywords, sourceCorpus);
  const keywordsMatch = coverage(keywords, tailoredCorpus);

  const jdSkillHints = keywords;
  const sourceSkills = skillNames(source);
  const tailoredSkills = skillNames(tailored);
  const skillsBefore = coverage(jdSkillHints, sourceSkills.join(" "));
  const skillsAlignment = coverage(jdSkillHints, tailoredSkills.join(" "));

  const experienceBefore = titleAlignment(source, jobDescription);
  const experienceRelevance = titleAlignment(tailored, jobDescription);

  const completeness = sectionCompleteness(tailored);
  const penalties =
    unsupportedClaimCount * 8 +
    stuffingPenalty(tailored, keywords) +
    duplicatePenalty(tailored);

  const raw =
    keywordsMatch * 0.35 +
    skillsAlignment * 0.2 +
    experienceRelevance * 0.15 +
    completeness * 0.2 +
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
      : keywords.filter((k) => !tailoredCorpus.includes(k)).slice(0, 12);

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
      "Estimated job alignment from evidenced keyword coverage, skill overlap, title fit, and section completeness. This is not an ATS-pass guarantee.",
  };
}
