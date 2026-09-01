import { normalizeKey } from "./json";
import { isSectionStopHeading } from "./courseworkBounds";
import type { CanonicalSkillGroup } from "./types";

const SKILLS_HEADING = /^(key\s+)?(technical\s+)?skills\s*:?\s*$/i;
const CATEGORY_LINE = /^([^:]{2,40}):\s*(.+)$/;

export interface RecoveredSkillGroup {
  category: string;
  skills: string[];
}

function splitSkills(value: string): string[] {
  return value
    .split(/\s*[,;•·|]\s*/)
    .map((part) => part.replace(/^[-–—*]\s*/, "").trim())
    .filter((part) => part.length > 1 && !SKILLS_HEADING.test(part));
}

export function recoverSkillsBounded(cvText: string): RecoveredSkillGroup[] {
  if (!cvText.trim()) return [];
  const lines = cvText.replace(/\r\n/g, "\n").split("\n");
  let started = false;
  const groups: RecoveredSkillGroup[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!started) {
      if (SKILLS_HEADING.test(line)) started = true;
      continue;
    }
    if (isSectionStopHeading(line) && !SKILLS_HEADING.test(line)) break;

    const match = line.match(CATEGORY_LINE);
    if (match) {
      const category = match[1].trim().replace(/\*+/g, "");
      if (SKILLS_HEADING.test(category)) continue;
      const skills = splitSkills(match[2]);
      if (!skills.length) continue;
      const existing = groups.find((group) => normalizeKey(group.category) === normalizeKey(category));
      if (existing) {
        for (const skill of skills) {
          if (!existing.skills.some((name) => normalizeKey(name) === normalizeKey(skill))) {
            existing.skills.push(skill);
          }
        }
      } else {
        groups.push({ category, skills });
      }
      continue;
    }
  }

  return groups;
}

export function mergeSkillGroups(
  extracted: CanonicalSkillGroup[],
  recovered: RecoveredSkillGroup[],
): CanonicalSkillGroup[] {
  const result = extracted.map((group) => ({
    ...group,
    skills: group.skills.map((skill) => ({ ...skill })),
  }));
  const used = new Set(result.flatMap((group) => [group.id, ...group.skills.map((skill) => skill.id)]));

  const nextId = (prefix: string) => {
    let index = 1;
    while (used.has(`${prefix}-${index}`)) index += 1;
    const id = `${prefix}-${index}`;
    used.add(id);
    return id;
  };

  for (const group of recovered) {
    let target = result.find((item) => normalizeKey(item.category) === normalizeKey(group.category));
    if (!target) {
      target = {
        id: nextId("skill-group"),
        category: group.category,
        skills: [],
      };
      result.push(target);
      used.add(target.id);
    }
    const have = new Set(target.skills.map((skill) => normalizeKey(skill.name)));
    for (const name of group.skills) {
      const key = normalizeKey(name);
      if (!key || have.has(key)) continue;
      target.skills.push({ id: nextId(`${target.id}-item`), name });
      have.add(key);
    }
  }

  return result;
}

export function unionSkillGroups(
  source: CanonicalSkillGroup[],
  tailored: CanonicalSkillGroup[],
): CanonicalSkillGroup[] {
  return mergeSkillGroups(tailored, source.map((group) => ({
    category: group.category,
    skills: group.skills.map((skill) => skill.name),
  }))).map((group) => {
    const original = source.find((item) => item.id === group.id)
      || source.find((item) => normalizeKey(item.category) === normalizeKey(group.category));
    if (!original) return group;
    const byName = new Map(original.skills.map((skill) => [normalizeKey(skill.name), skill]));
    return {
      ...group,
      id: original.id,
      category: original.category,
      skills: group.skills.map((skill) => byName.get(normalizeKey(skill.name)) ?? skill),
    };
  });
}
