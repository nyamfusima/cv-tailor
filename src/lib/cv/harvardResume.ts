/** Renderer-owned section order. The model must not decide visual order. */
export const RESUME_SECTION_ORDER = [
  "SUMMARY",
  "KEY SKILLS",
  "EXPERIENCE",
  "EDUCATION",
  "PROJECTS",
  "CERTIFICATIONS",
] as const;

export type ResumeSectionTitle = (typeof RESUME_SECTION_ORDER)[number];

export function sectionOrderIndexes(blob: string): Record<ResumeSectionTitle, number> {
  const upper = blob.toUpperCase();
  return {
    SUMMARY: upper.indexOf("SUMMARY"),
    "KEY SKILLS": upper.indexOf("KEY SKILLS"),
    EXPERIENCE: upper.indexOf("EXPERIENCE"),
    EDUCATION: upper.indexOf("EDUCATION"),
    PROJECTS: upper.indexOf("PROJECTS"),
    CERTIFICATIONS: Math.max(upper.indexOf("CERTIFICATIONS"), upper.indexOf("PROFESSIONAL DEVELOPMENT")),
  };
}
