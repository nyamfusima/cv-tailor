import { asArray, asRecord, asString, asStringArray, normalizeKey } from "./json";
import { isDedicatedSectionTitle } from "./extractionReport";
import type {
  CanonicalCV,
  CanonicalCertification,
  CanonicalCoursework,
  CanonicalEducation,
  CanonicalExperience,
  CanonicalProject,
  CanonicalSkillGroup,
  CustomSection,
  SourceBullet,
} from "./types";

function nextId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function stampBullets(prefix: string, bullets: string[]): SourceBullet[] {
  return bullets.map((text, i) => ({ id: `${prefix}-bullet-${i + 1}`, text }));
}

function parseCoursework(raw: unknown, educationId: string): CanonicalCoursework[] {
  const items = asArray(raw);
  const out: CanonicalCoursework[] = [];
  items.forEach((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) return;
      out.push({ id: `${educationId}-coursework-${out.length + 1}`, text });
      return;
    }
    const rec = asRecord(item);
    if (!rec) return;
    const text = asString(rec.text || rec.name).trim();
    if (!text) return;
    const id = asString(rec.id) || `${educationId}-coursework-${out.length + 1}`;
    out.push({ id, text });
  });
  return out;
}

function uniqueByText(items: CanonicalCoursework[]): CanonicalCoursework[] {
  const seen = new Set<string>();
  const out: CanonicalCoursework[] = [];
  for (const item of items) {
    const key = normalizeKey(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Recover coursework lists that PDF/DOCX extraction often leaves as a heading
 * plus a comma-separated line. Used only to fill empty or shorter extracted lists.
 */
export function recoverCourseworkFromText(cvText: string): string[] {
  if (!cvText) return [];
  const heading = /(?:relevant\s+)?(?:coursework|modules?|subjects?|courses? taken)\s*[:\-–]\s*([^\n]+(?:\n(?![A-Z][A-Za-z /&]{2,40}:)[^\n]+)*)/i;
  const match = cvText.match(heading);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;•·|\n]/)
    .map((part) => part.replace(/^[-–—*]\s*/, "").trim())
    .filter((part) => part.length > 1 && part.length < 80 && !/^https?:/i.test(part));
}

function mergeCoursework(extracted: CanonicalCoursework[], recovered: string[], educationId: string): CanonicalCoursework[] {
  if (recovered.length === 0) return extracted;
  const existing = new Set(extracted.map((c) => normalizeKey(c.text)));
  const merged = [...extracted];
  for (const text of recovered) {
    const key = normalizeKey(text);
    if (!key || existing.has(key)) continue;
    existing.add(key);
    merged.push({ id: `${educationId}-coursework-${merged.length + 1}`, text });
  }
  return uniqueByText(merged);
}

function parseExperience(raw: unknown): CanonicalExperience[] {
  return asArray(raw).map((item, i) => {
    const rec = asRecord(item) ?? {};
    const id = asString(rec.id) || nextId("experience", i);
    const bullets = asStringArray(rec.bullets);
    const sourceFromField = asArray(rec.sourceBullets);
    const sourceBullets: SourceBullet[] =
      sourceFromField.length > 0
        ? sourceFromField.map((b, j) => {
            const br = asRecord(b) ?? {};
            return { id: asString(br.id) || `${id}-bullet-${j + 1}`, text: asString(br.text) };
          }).filter((b) => b.text)
        : stampBullets(id, bullets);
    return {
      id,
      title: asString(rec.title),
      company: asString(rec.company),
      dates: asString(rec.dates),
      location: asString(rec.location),
      bullets: sourceBullets.map((b) => b.text),
      sourceBullets,
      bulletEvidence: [],
    };
  });
}

function parseEducation(raw: unknown, recovered: string[]): CanonicalEducation[] {
  const rows = asArray(raw);
  return rows.map((item, i) => {
    const rec = asRecord(item) ?? {};
    const id = asString(rec.id) || nextId("education", i);
    const extracted = parseCoursework(rec.coursework, id);
    const attachRecovered = rows.length === 1 || i === 0;
    const coursework = attachRecovered ? mergeCoursework(extracted, recovered, id) : extracted;
    return {
      id,
      degree: asString(rec.degree),
      institution: asString(rec.institution),
      dates: asString(rec.dates),
      location: asString(rec.location),
      coursework,
    };
  });
}

function parseCerts(raw: unknown): CanonicalCertification[] {
  return asArray(raw).map((item, i) => {
    const rec = asRecord(item) ?? {};
    return {
      id: asString(rec.id) || nextId("certification", i),
      name: asString(rec.name),
      issuer: asString(rec.issuer),
      date: asString(rec.date),
    };
  });
}

function parseProjects(raw: unknown): CanonicalProject[] {
  return asArray(raw).map((item, i) => {
    const rec = asRecord(item) ?? {};
    const id = asString(rec.id) || nextId("project", i);
    const bullets = asStringArray(rec.bullets);
    const description = asString(rec.description);
    const sourceBullets =
      bullets.length > 0
        ? stampBullets(id, bullets)
        : description
          ? [{ id: `${id}-bullet-1`, text: description }]
          : [];
    return {
      id,
      name: asString(rec.name),
      description,
      technologies: asStringArray(rec.technologies),
      url: asString(rec.url),
      dates: asString(rec.dates),
      bullets: sourceBullets.map((b) => b.text),
      sourceBullets,
      bulletEvidence: [],
    };
  });
}

function parseSkills(raw: unknown): CanonicalSkillGroup[] {
  return asArray(raw).map((item, i) => {
    const rec = asRecord(item) ?? {};
    const id = asString(rec.id) || nextId("skill-group", i);
    const names = asStringArray(rec.skills);
    const skillIds = asStringArray(rec.skillIds);
    return {
      id,
      category: asString(rec.category) || "Skills",
      skills: names.map((name, j) => ({
        id: skillIds[j] || `${id}-item-${j + 1}`,
        name,
      })),
    };
  });
}

function parseCustomSections(raw: unknown): CustomSection[] {
  const out: CustomSection[] = [];
  asArray(raw).forEach((item, i) => {
    const rec = asRecord(item) ?? {};
    const title = asString(rec.title).trim();
    if (!title || isDedicatedSectionTitle(title)) return;
    const id = asString(rec.id) || nextId("custom", i);
    const items = asArray(rec.items)
      .map((entry, j) => {
        if (typeof entry === "string") {
          const text = entry.trim();
          return text ? { id: `${id}-item-${j + 1}`, text } : null;
        }
        const row = asRecord(entry) ?? {};
        const text = asString(row.text).trim();
        if (!text) return null;
        return { id: asString(row.id) || `${id}-item-${j + 1}`, text };
      })
      .filter((entry): entry is { id: string; text: string } => Boolean(entry));
    if (items.length === 0 && !title) return;
    out.push({ id, title, items });
  });
  return out;
}

export function canonicalizeCv(input: unknown, cvText = ""): CanonicalCV {
  const rec = asRecord(input) ?? {};
  const recovered = recoverCourseworkFromText(cvText);
  const contactSource = asRecord(rec.contact) ?? rec;
  return {
    contact: {
      name: asString(contactSource.name ?? rec.name),
      email: asString(contactSource.email ?? rec.email),
      phone: asString(contactSource.phone ?? rec.phone),
      location: asString(contactSource.location ?? rec.location),
      linkedin: asString(contactSource.linkedin ?? rec.linkedin),
    },
    summary: asString(rec.summary),
    experience: parseExperience(rec.experience),
    education: parseEducation(rec.education, recovered),
    certifications: parseCerts(rec.certifications),
    projects: parseProjects(rec.projects),
    skills: parseSkills(rec.skills),
    customSections: parseCustomSections(rec.customSections),
  };
}

export function cloneCanonical(cv: CanonicalCV): CanonicalCV {
  return structuredClone(cv);
}
