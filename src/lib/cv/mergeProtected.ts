import { assessRewrite, assessUnsupportedScope } from "./claimStrength";
import { asArray, asRecord, asString, asStringArray } from "./json";
import { introducesNewNumbers } from "./numbers";
import type {
  BulletEvidence,
  CanonicalCV,
  CanonicalExperience,
  CanonicalProject,
  CanonicalSkillGroup,
  ClaimStrengthWarning,
  TailorDelta,
  TailorDeltaExperience,
  TailorDeltaProject,
} from "./types";
import { cloneCanonical } from "./canonical";

function parseDelta(raw: unknown): TailorDelta {
  const rec = asRecord(raw) ?? {};
  const experience = asArray(rec.experience).map((item) => {
    const row = asRecord(item) ?? {};
    return {
      id: asString(row.id),
      bullets: asArray(row.bullets).map((b) => {
        const br = asRecord(b) ?? {};
        return {
          sourceBulletIds: asStringArray(br.sourceBulletIds),
          tailoredText: asString(br.tailoredText || br.text),
          matchedKeywords: asStringArray(br.matchedKeywords),
        };
      }),
    } satisfies TailorDeltaExperience;
  });
  const projects = asArray(rec.projects).map((item) => {
    const row = asRecord(item) ?? {};
    return {
      id: asString(row.id),
      description: asString(row.description),
    } satisfies TailorDeltaProject;
  });
  return {
    summary: asString(rec.summary),
    experience,
    projects,
    skillOrder: asArray(rec.skillOrder).map((item) => {
      const row = asRecord(item) ?? {};
      return { categoryId: asString(row.categoryId), skillIds: asStringArray(row.skillIds) };
    }),
    keywordClassifications: asArray(rec.keywordClassifications).map((item) => {
      const row = asRecord(item) ?? {};
      const status = asString(row.status);
      const allowed = ["evidenced_and_used", "evidenced_but_not_used", "related_but_not_equivalent", "not_evidenced"] as const;
      return {
        keyword: asString(row.keyword),
        status: (allowed.includes(status as (typeof allowed)[number])
          ? status
          : "not_evidenced") as TailorDelta["keywordClassifications"][number]["status"],
      };
    }),
    missingKeywords: asStringArray(rec.missingKeywords),
    assumptions: asStringArray(rec.assumptions),
    conflicts: asStringArray(rec.conflicts),
  };
}

function rewriteExperience(
  job: CanonicalExperience,
  delta: TailorDeltaExperience | undefined,
  warnings: ClaimStrengthWarning[],
): CanonicalExperience {
  if (!delta) {
    return {
      ...job,
      bullets: job.sourceBullets.map((b) => b.text),
      bulletEvidence: job.sourceBullets.map((b) => ({
        id: `${job.id}-out-${b.id}`,
        sourceBulletIds: [b.id],
        originalText: b.text,
        tailoredText: b.text,
        matchedKeywords: [],
      })),
    };
  }

  const used = new Set<string>();
  const bullets: string[] = [];
  const evidence: BulletEvidence[] = [];

  for (const item of delta.bullets) {
    const validIds = item.sourceBulletIds.filter((id) => job.sourceBullets.some((b) => b.id === id));
    if (validIds.length === 0) continue;
    validIds.forEach((id) => used.add(id));
    const originalText = validIds
      .map((id) => job.sourceBullets.find((b) => b.id === id)?.text ?? "")
      .filter(Boolean)
      .join(" ");
    const proposed = item.tailoredText.trim();
    let text = !proposed || introducesNewNumbers(proposed, originalText) ? originalText : proposed;
    const inflation =
      assessRewrite(originalText, text, validIds[0] ?? job.id) ??
      assessUnsupportedScope(originalText, text, validIds[0] ?? job.id);
    if (inflation && inflation.severity === "high") {
      warnings.push(inflation);
      text = originalText;
    }
    bullets.push(text);
    evidence.push({
      id: `${job.id}-out-${evidence.length + 1}`,
      sourceBulletIds: validIds,
      originalText,
      tailoredText: text,
      matchedKeywords: item.matchedKeywords,
    });
  }

  for (const source of job.sourceBullets) {
    if (used.has(source.id)) continue;
    bullets.push(source.text);
    evidence.push({
      id: `${job.id}-out-${evidence.length + 1}`,
      sourceBulletIds: [source.id],
      originalText: source.text,
      tailoredText: source.text,
      matchedKeywords: [],
    });
  }

  return {
    ...job,
    title: job.title,
    company: job.company,
    dates: job.dates,
    location: job.location,
    bullets,
    bulletEvidence: evidence,
  };
}

function rewriteProject(
  project: CanonicalProject,
  delta: TailorDeltaProject | undefined,
  warnings: ClaimStrengthWarning[],
): CanonicalProject {
  let description =
    delta?.description.trim() && !introducesNewNumbers(delta.description, project.description)
      ? delta.description.trim()
      : project.description;
  const scope = assessUnsupportedScope(project.description, description, project.id);
  if (scope && scope.severity === "high") {
    warnings.push(scope);
    description = project.description;
  }
  return {
    ...project,
    name: project.name,
    dates: project.dates,
    url: project.url,
    technologies: [...project.technologies],
    description,
    bullets: project.sourceBullets.map((b) => b.text),
    bulletEvidence: project.sourceBullets.map((b) => ({
      id: `${project.id}-out-${b.id}`,
      sourceBulletIds: [b.id],
      originalText: b.text,
      tailoredText: b.id === `${project.id}-bullet-1` ? description : b.text,
      matchedKeywords: [],
    })),
  };
}

function applySkillOrder(source: CanonicalSkillGroup[], order: TailorDelta["skillOrder"]): CanonicalSkillGroup[] {
  if (!order.length) return source.map((g) => ({ ...g, skills: [...g.skills] }));
  const byId = new Map(source.map((g) => [g.id, g]));
  const used = new Set<string>();
  const result: CanonicalSkillGroup[] = [];

  for (const entry of order) {
    const group = byId.get(entry.categoryId);
    if (!group) continue;
    used.add(group.id);
    const skillById = new Map(group.skills.map((s) => [s.id, s]));
    const ordered = entry.skillIds.map((id) => skillById.get(id)).filter(Boolean) as CanonicalSkillGroup["skills"];
    const leftover = group.skills.filter((s) => !ordered.some((o) => o.id === s.id));
    result.push({ ...group, skills: [...ordered, ...leftover] });
  }

  for (const group of source) {
    if (!used.has(group.id)) result.push({ ...group, skills: [...group.skills] });
  }
  return result;
}

export function parseTailorDelta(raw: unknown): TailorDelta {
  return parseDelta(raw);
}

export function emptyDelta(): TailorDelta {
  return {
    summary: "",
    experience: [],
    projects: [],
    skillOrder: [],
    keywordClassifications: [],
    missingKeywords: [],
    assumptions: [],
    conflicts: [],
  };
}

/**
 * Build a tailored CV by copying every protected field from the source.
 * The model delta may only rewrite summary, bullet wording, project descriptions,
 * and skill order.
 */
export function mergeProtectedFromSource(source: CanonicalCV, rawDelta: unknown): {
  tailored: CanonicalCV;
  delta: TailorDelta;
  claimStrengthWarnings: ClaimStrengthWarning[];
} {
  const delta = parseDelta(rawDelta);
  const expDelta = new Map(delta.experience.map((e) => [e.id, e]));
  const projectDelta = new Map(delta.projects.map((p) => [p.id, p]));
  const claimStrengthWarnings: ClaimStrengthWarning[] = [];

  const tailored = cloneCanonical(source);
  tailored.summary = delta.summary.trim() || source.summary;
  tailored.contact = { ...source.contact };
  tailored.experience = source.experience.map((job) => rewriteExperience(job, expDelta.get(job.id), claimStrengthWarnings));
  tailored.education = source.education.map((edu) => ({
    ...edu,
    coursework: edu.coursework.map((c) => ({ ...c })),
  }));
  tailored.certifications = source.certifications.map((c) => ({ ...c }));
  tailored.projects = source.projects.map((project) => rewriteProject(project, projectDelta.get(project.id), claimStrengthWarnings));
  const summaryScope = assessUnsupportedScope(source.summary, tailored.summary, "summary");
  if (summaryScope) {
    claimStrengthWarnings.push(summaryScope);
    tailored.summary = source.summary;
  }
  tailored.skills = applySkillOrder(source.skills, delta.skillOrder);
  tailored.customSections = source.customSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));

  return { tailored, delta, claimStrengthWarnings };
}

/** Restore any missing protected item from source. Idempotent. */
export function restoreMissingFromSource(source: CanonicalCV, tailored: CanonicalCV): CanonicalCV {
  const { tailored: restored } = mergeProtectedFromSource(source, {
    summary: tailored.summary,
    experience: tailored.experience.map((job) => ({
      id: job.id,
      bullets: (job.bulletEvidence.length
        ? job.bulletEvidence
        : job.sourceBullets.map((b) => ({
            sourceBulletIds: [b.id],
            tailoredText: b.text,
            matchedKeywords: [],
          }))
      ).map((e) => ({
        sourceBulletIds: e.sourceBulletIds,
        tailoredText: e.tailoredText,
        matchedKeywords: e.matchedKeywords ?? [],
      })),
    })),
    projects: tailored.projects.map((p) => ({ id: p.id, description: p.description })),
    skillOrder: tailored.skills.map((g) => ({
      categoryId: g.id,
      skillIds: g.skills.map((s) => s.id),
    })),
    keywordClassifications: [],
    missingKeywords: [],
    assumptions: [],
    conflicts: [],
  });
  return restored;
}

export function looksLikeFullCv(raw: unknown): boolean {
  const rec = asRecord(raw);
  if (!rec) return false;
  return Array.isArray(rec.education) || Array.isArray(rec.experience) || typeof rec.name === "string";
}

/**
 * If a fallback model ignored the delta schema and re-emitted a full CV,
 * strip it down to a delta so merge still owns protected fields.
 */
export function deltaFromFullCv(raw: unknown): TailorDelta {
  const rec = asRecord(raw) ?? {};
  return parseDelta({
    summary: rec.summary,
    experience: asArray(rec.experience).map((item) => {
      const row = asRecord(item) ?? {};
      const id = asString(row.id);
      const bullets = asStringArray(row.bullets);
      return {
        id,
        bullets: bullets.map((text, i) => ({
          sourceBulletIds: asStringArray(asRecord(asArray(row.bulletEvidence)[i])?.sourceBulletIds).length
            ? asStringArray(asRecord(asArray(row.bulletEvidence)[i])?.sourceBulletIds)
            : id
              ? [`${id}-bullet-${i + 1}`]
              : [],
          tailoredText: text,
          matchedKeywords: [],
        })),
      };
    }),
    projects: asArray(rec.projects).map((item) => {
      const row = asRecord(item) ?? {};
      return { id: asString(row.id), description: asString(row.description) };
    }),
    skillOrder: [],
    keywordClassifications: rec.keywordClassifications,
    missingKeywords: rec.missingKeywords,
    assumptions: rec.assumptions,
    conflicts: rec.conflicts,
  });
}

export function coerceDelta(raw: unknown): unknown {
  if (looksLikeFullCv(raw) && !asRecord(raw)?.skillOrder) {
    return deltaFromFullCv(raw);
  }
  return raw;
}
