const STOP_HEADING =
  /^(projects?|experience|employment|work history|work experience|skills|technical skills|key skills|certifications?|languages?|volunteer(?:ing|er experience)?|awards?|honou?rs|publications?|professional development|summary|profile|references)\s*:?\s*$/i;

const COURSEWORK_START = /^(relevant\s+)?(coursework|modules?|subjects?|courses?\s+taken)\s*:?\s*/i;
const IGNORE_LABEL = /^(relevant\s+)?(areas?|coursework|modules?|subjects?|technologies)\s*:?\s*$/i;

const BLEED_PATTERNS: RegExp[] = [
  /\btechnologies\s*:/i,
  /\bparticipants\b/i,
  /\bactive users\b/i,
  /\branking\b/i,
  /\bbuilt an\b/i,
  /^relevant areas\s*:/i,
];

export const COURSEWORK_LENGTH_LIMIT = 80;

export interface CourseworkRecovery {
  items: string[];
  uncertain: boolean;
  warning?: string;
}

export function isSectionStopHeading(line: string): boolean {
  return STOP_HEADING.test(line.trim());
}

export function looksLikeCourseworkBleed(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isSectionStopHeading(trimmed)) return true;
  if (trimmed.length > COURSEWORK_LENGTH_LIMIT) return true;
  return BLEED_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isEmptyCourseworkLabel(text: string): boolean {
  return IGNORE_LABEL.test(text.trim());
}

export function isPlausibleCourseTitle(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > COURSEWORK_LENGTH_LIMIT) return false;
  if (isEmptyCourseworkLabel(trimmed)) return false;
  if (looksLikeCourseworkBleed(trimmed)) return false;
  if (/^https?:/i.test(trimmed)) return false;
  if (/^\d{1,2}$/.test(trimmed)) return false;
  if (/^0+\d*\+?$/.test(trimmed)) return false;
  return true;
}

/** Split a genuine course list; drop later-section lines instead of turning them into fake titles. */
export function courseworkItemsFromExtractedText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed || isEmptyCourseworkLabel(trimmed) || isSectionStopHeading(trimmed)) return [];
  if (/\btechnologies\s*:/i.test(trimmed)) return [];

  const parts = splitCourseList(trimmed);
  if (looksLikeCourseworkBleed(trimmed)) {
    if (parts.length > 1 && parts.every(isPlausibleCourseTitle)) return parts;
    return [];
  }
  return parts.filter(isPlausibleCourseTitle);
}

export function isCredibleCourseList(items: Array<{ text: string }>): boolean {
  return items.length > 0 && items.every((item) => isPlausibleCourseTitle(item.text));
}

/** Split a course list without breaking thousands separators such as 1,349 or 3,000+. */
export function splitCourseList(text: string): string[] {
  return text
    .split(/\s*[;•·|]\s*|(?<!\d),(?!\d{3}\b)/)
    .map((part) => part.replace(/^[-–—*]\s*/, "").trim())
    .filter(Boolean);
}

export function recoverCourseworkBounded(cvText: string): CourseworkRecovery {
  if (!cvText.trim()) return { items: [], uncertain: false };

  const lines = cvText.replace(/\r\n/g, "\n").split("\n");
  let started = false;
  let sawStop = false;
  const collected: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^education\s*:?\s*$/i.test(line)) continue;

    if (started && isSectionStopHeading(line)) {
      sawStop = true;
      break;
    }

    const startMatch = line.match(COURSEWORK_START);
    if (startMatch) {
      started = true;
      const rest = line.slice(startMatch[0].length).trim();
      if (rest && !IGNORE_LABEL.test(rest)) collected.push(...splitCourseList(rest));
      continue;
    }

    if (!started) continue;

    if (IGNORE_LABEL.test(line) || /^relevant\s+areas?\s*:?\s*$/i.test(line)) continue;
    const withoutLabel = line.replace(/^(relevant\s+)?(areas?|coursework|modules?|subjects?|technologies)\s*:\s*/i, "");
    if (!withoutLabel || IGNORE_LABEL.test(withoutLabel)) continue;
    collected.push(...splitCourseList(withoutLabel));
  }

  if (!started) return { items: [], uncertain: false };

  if (!sawStop) {
    return {
      items: [],
      uncertain: true,
      warning: "Coursework boundaries were uncertain; recovery was skipped rather than reading past the education section.",
    };
  }

  const items = collected.filter(isPlausibleCourseTitle);
  if (collected.some((part) => looksLikeCourseworkBleed(part))) {
    return {
      items: [],
      uncertain: true,
      warning: "Recovered coursework overlapped a later section; recovery was skipped.",
    };
  }

  return { items, uncertain: false };
}
