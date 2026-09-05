import { introducesNewNumbers, collectAllNumbers } from "./numbers";
import { normalizeKey } from "./json";
import { catalogSkillMatchesSourceText } from "./skillPromotion";
import type { CanonicalCV, PreservationReport } from "./types";

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

function allIds(cv: CanonicalCV): string[] {
  const ids: string[] = [];
  for (const job of cv.experience) {
    ids.push(job.id);
    for (const b of job.sourceBullets) ids.push(b.id);
  }
  for (const edu of cv.education) {
    ids.push(edu.id);
    for (const c of edu.coursework) ids.push(c.id);
  }
  for (const cert of cv.certifications) ids.push(cert.id);
  for (const project of cv.projects) {
    ids.push(project.id);
    for (const b of project.sourceBullets) ids.push(b.id);
  }
  for (const group of cv.skills) {
    ids.push(group.id);
    for (const skill of group.skills) ids.push(skill.id);
  }
  for (const section of cv.customSections ?? []) {
    ids.push(section.id);
    for (const item of section.items) ids.push(item.id);
  }
  return ids;
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    else seen.add(id);
  }
  return dupes;
}

function sourceSkillNames(cv: CanonicalCV): Set<string> {
  const set = new Set<string>();
  for (const group of cv.skills) {
    for (const skill of group.skills) set.add(normalizeKey(skill.name));
  }
  for (const project of cv.projects) {
    for (const tech of project.technologies) set.add(normalizeKey(tech));
  }
  return set;
}

function sourceTextBlob(cv: CanonicalCV): string {
  const parts: string[] = [
    cv.summary,
    ...cv.experience.flatMap((j) => [j.title, j.company, ...j.sourceBullets.map((b) => b.text)]),
    ...cv.projects.flatMap((p) => [p.name, p.description, ...p.technologies]),
    ...cv.skills.flatMap((g) => g.skills.map((s) => s.name)),
    ...cv.education.flatMap((e) => [e.degree, e.institution, ...e.coursework.map((c) => c.text)]),
    ...cv.certifications.flatMap((c) => [c.name, c.issuer]),
  ];
  return parts.join("\n");
}

export function validatePreservation(source: CanonicalCV, tailored: CanonicalCV): PreservationReport {
  const missingIds: string[] = [];
  const changedProtectedFields: string[] = [];
  const unsupportedClaims: string[] = [];
  const warnings: string[] = [];

  const contactKeys = ["name", "email", "phone", "location", "linkedin"] as const;
  for (const key of contactKeys) {
    if (source.contact[key] !== tailored.contact[key]) {
      changedProtectedFields.push(`contact.${key}`);
    }
  }

  const tailoredExp = new Map(tailored.experience.map((j) => [j.id, j]));
  for (const job of source.experience) {
    const next = tailoredExp.get(job.id);
    if (!next) {
      missingIds.push(job.id);
      continue;
    }
    if (next.title !== job.title) changedProtectedFields.push(`${job.id}.title`);
    if (next.company !== job.company) changedProtectedFields.push(`${job.id}.company`);
    if (next.dates !== job.dates) changedProtectedFields.push(`${job.id}.dates`);
    if (next.location !== job.location) changedProtectedFields.push(`${job.id}.location`);
    for (const bullet of job.sourceBullets) {
      const cited = next.bulletEvidence.some((e) => e.sourceBulletIds.includes(bullet.id));
      const stillPresent = next.bullets.some((text) => normalizeKey(text) === normalizeKey(bullet.text));
      if (!cited && !stillPresent) missingIds.push(bullet.id);
    }
    for (const evidence of next.bulletEvidence) {
      for (const sid of evidence.sourceBulletIds) {
        if (!job.sourceBullets.some((b) => b.id === sid)) {
          warnings.push(`evidence ${evidence.id} references unknown source ${sid}`);
        }
      }
      const sourceText = evidence.sourceBulletIds
        .map((id) => job.sourceBullets.find((b) => b.id === id)?.text ?? "")
        .join(" ");
      if (introducesNewNumbers(evidence.tailoredText, sourceText || job.sourceBullets.map((b) => b.text).join(" "))) {
        changedProtectedFields.push(`${evidence.id}.metric`);
      }
    }
  }

  if (source.experience.length > 0 && tailored.experience.length === 0) {
    warnings.push("experience array unexpectedly empty");
  }

  const tailoredEdu = new Map(tailored.education.map((e) => [e.id, e]));
  for (const edu of source.education) {
    const next = tailoredEdu.get(edu.id);
    if (!next) {
      missingIds.push(edu.id);
      continue;
    }
    if (next.degree !== edu.degree) changedProtectedFields.push(`${edu.id}.degree`);
    if (next.institution !== edu.institution) changedProtectedFields.push(`${edu.id}.institution`);
    if (next.dates !== edu.dates) changedProtectedFields.push(`${edu.id}.dates`);
    const nextById = new Map(next.coursework.map((c) => [c.id, c]));
    const nextByText = new Set(next.coursework.map((c) => normalizeKey(c.text)));
    for (const course of edu.coursework) {
      const match = nextById.get(course.id);
      if (!match) {
        if (!nextByText.has(normalizeKey(course.text))) missingIds.push(course.id);
        else changedProtectedFields.push(`${course.id}.id-mismatch`);
        continue;
      }
      if (match.text !== course.text) changedProtectedFields.push(`${course.id}.text`);
    }
  }

  if (source.education.length > 0 && tailored.education.length === 0) {
    warnings.push("education array unexpectedly empty");
  }

  const tailoredCerts = new Map(tailored.certifications.map((c) => [c.id, c]));
  for (const cert of source.certifications) {
    const next = tailoredCerts.get(cert.id);
    if (!next) {
      missingIds.push(cert.id);
      continue;
    }
    if (next.name !== cert.name) changedProtectedFields.push(`${cert.id}.name`);
    if (next.issuer !== cert.issuer) changedProtectedFields.push(`${cert.id}.issuer`);
    if (next.date !== cert.date) changedProtectedFields.push(`${cert.id}.date`);
  }

  const tailoredProjects = new Map(tailored.projects.map((p) => [p.id, p]));
  for (const project of source.projects) {
    const next = tailoredProjects.get(project.id);
    if (!next) {
      missingIds.push(project.id);
      continue;
    }
    if (next.name !== project.name) changedProtectedFields.push(`${project.id}.name`);
    if (next.dates !== project.dates) changedProtectedFields.push(`${project.id}.dates`);
    if (next.url !== project.url) changedProtectedFields.push(`${project.id}.url`);
    const sourceTech = new Set(project.technologies.map(normalizeKey));
    for (const tech of next.technologies) {
      if (!sourceTech.has(normalizeKey(tech))) unsupportedClaims.push(`project-tech:${tech}`);
    }
  }

  const allowedSkills = sourceSkillNames(source);
  const sourceBlob = sourceTextBlob(source);
  const tailoredSkillNames = new Set(
    tailored.skills.flatMap((group) => group.skills.map((skill) => normalizeKey(skill.name))),
  );
  for (const group of source.skills) {
    for (const skill of group.skills) {
      if (!tailoredSkillNames.has(normalizeKey(skill.name))) {
        missingIds.push(skill.id);
      }
    }
  }
  for (const group of tailored.skills) {
    for (const skill of group.skills) {
      if (
        !allowedSkills.has(normalizeKey(skill.name)) &&
        !catalogSkillMatchesSourceText(skill.name, sourceBlob)
      ) {
        unsupportedClaims.push(`skill:${skill.name}`);
      }
    }
  }

  const sourceNumbers = collectAllNumbers([
    source.summary,
    ...source.experience.flatMap((j) => j.sourceBullets.map((b) => b.text)),
    ...source.projects.map((p) => p.description),
  ]);
  const tailoredNumbers = collectAllNumbers([
    tailored.summary,
    ...tailored.experience.flatMap((j) => j.bullets),
    ...tailored.projects.map((p) => p.description),
  ]);
  for (const n of tailoredNumbers) {
    if (!sourceNumbers.has(n)) pushUnique(changedProtectedFields, `numeric:${n}`);
  }

  const tailoredCustom = new Map((tailored.customSections ?? []).map((s) => [s.id, s]));
  for (const section of source.customSections ?? []) {
    const next = tailoredCustom.get(section.id);
    if (!next) {
      missingIds.push(section.id);
      continue;
    }
    if (next.title !== section.title) changedProtectedFields.push(`${section.id}.title`);
    const nextItems = new Map(next.items.map((item) => [item.id, item]));
    for (const item of section.items) {
      const match = nextItems.get(item.id);
      if (!match) {
        missingIds.push(item.id);
        continue;
      }
      if (match.text !== item.text) changedProtectedFields.push(`${item.id}.text`);
    }
  }

  const duplicateIds = findDuplicates(allIds(tailored));

  return {
    valid:
      missingIds.length === 0 &&
      changedProtectedFields.length === 0 &&
      unsupportedClaims.length === 0 &&
      duplicateIds.length === 0,
    missingIds,
    changedProtectedFields,
    unsupportedClaims,
    duplicateIds,
    warnings,
    claimStrengthWarnings: [],
  };
}

export function formatPreservationIssues(report: PreservationReport): string {
  return [
    ...report.unsupportedClaims,
    ...report.missingIds.map((id) => `missing:${id}`),
    ...report.changedProtectedFields.map((f) => `changed:${f}`),
    ...report.duplicateIds.map((id) => `duplicate:${id}`),
  ]
    .slice(0, 8)
    .join("; ");
}

export function missingItemCounts(report: PreservationReport): Record<string, number> {
  const counts = {
    missingIds: report.missingIds.length,
    changedProtectedFields: report.changedProtectedFields.length,
    unsupportedClaims: report.unsupportedClaims.length,
    duplicateIds: report.duplicateIds.length,
    coursework: report.missingIds.filter((id) => id.includes("coursework")).length,
    education: report.missingIds.filter((id) => id.startsWith("education-") && !id.includes("coursework")).length,
  };
  return counts;
}
