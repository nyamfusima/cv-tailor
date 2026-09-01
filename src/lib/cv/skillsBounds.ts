import { normalizeKey } from "./json";
import type { CanonicalSkillGroup } from "./types";

const SKILLS_HEADING = /^(key\s+)?(technical\s+)?skills\s*:?\s*$/i;
const SKILLS_HEADING_INLINE =
  /(?:^|\n|\s)(?:key\s+skills|technical\s+skills)\s*:?\s+|(?:^|\n)\s*skills\s*:?\s+/i;
const SECTION_STOP =
  /^(experience|education|projects?|certifications?|work history|employment|work experience|summary|profile|references)\s*:?\s*$/i;
const SECTION_STOP_INLINE =
  /(?:^|\n|\s)(?=EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|WORK HISTORY|EMPLOYMENT)\b|(?:^|\n)\s*(?:Experience|Education|Projects|Certifications|Work History|Employment)\s*:?\s*(?:\n|$)/;
const CATEGORY_NOUN =
  /(languages?|tools?|backend|frontend|cloud|skills?|frameworks?|libraries|databases?|platforms?|etl|nlp|automation|ai|devops|testing|other|systems?)$/i;
const KNOWN_CATEGORIES = new Set([
  "ai",
  "automation",
  "backend",
  "cloud",
  "data",
  "data & etl",
  "data and etl",
  "databases",
  "developer tools",
  "devops",
  "etl",
  "frameworks",
  "frontend",
  "languages",
  "libraries",
  "nlp",
  "programming languages",
  "soft skills",
  "tools",
  "vector / nlp",
  "vector/nlp",
]);

export interface RecoveredSkillGroup {
  category: string;
  skills: string[];
}

export function splitSkills(value: string): string[] {
  return value
    .split(/\s*[,;•·|]\s*/)
    .map((part) => part.replace(/^[-–—*]\s*/, "").trim())
    .filter((part) => part.length > 1 && !SKILLS_HEADING.test(part) && !SECTION_STOP.test(part));
}

function cleanCategory(value: string): string {
  return value.trim().replace(/:+\s*$/, "").replace(/\*+/g, "");
}

function isKnownCategory(value: string): boolean {
  return KNOWN_CATEGORIES.has(normalizeKey(cleanCategory(value)));
}

function looksLikeCategoryHeading(line: string): boolean {
  const trimmed = cleanCategory(line);
  if (trimmed.length < 2 || trimmed.length > 42) return false;
  if (/[,;•·|]/.test(trimmed)) return false;
  if (SKILLS_HEADING.test(trimmed) || SECTION_STOP.test(trimmed)) return false;
  if (isKnownCategory(trimmed)) return true;
  if (CATEGORY_NOUN.test(trimmed)) return true;
  return /^[A-Z][A-Za-z0-9+/& ]*(?:\s*\/\s*[A-Z][A-Za-z0-9+/& ]*)?$/.test(trimmed)
    && !/[a-z]{5,}/.test(trimmed.replace(/^[A-Z]/, ""));
}

function isolateSkillsBlock(cvText: string): string {
  const text = cvText.replace(/\r\n/g, "\n");
  const heading = SKILLS_HEADING_INLINE.exec(text);
  if (!heading) return "";
  const rest = text.slice(heading.index + heading[0].length);
  const stop = rest.search(SECTION_STOP_INLINE);
  return (stop === -1 ? rest : rest.slice(0, stop)).trim();
}

function addGroup(groups: RecoveredSkillGroup[], category: string, skills: string[]) {
  const label = cleanCategory(category);
  if (!label || SKILLS_HEADING.test(label) || SECTION_STOP.test(label)) return;
  const items = skills.filter((skill) => normalizeKey(skill) !== normalizeKey(label));
  if (!items.length) return;
  const existing = groups.find((group) => normalizeKey(group.category) === normalizeKey(label));
  if (existing) {
    for (const skill of items) {
      if (!existing.skills.some((name) => normalizeKey(name) === normalizeKey(skill))) {
        existing.skills.push(skill);
      }
    }
    return;
  }
  groups.push({ category: label, skills: [...items] });
}

function categoryBeforeColon(block: string, colonIndex: number): string | null {
  const tail = block.slice(0, colonIndex).replace(/[\s,;•·|]+$/, "").split(/,\s*/).pop()?.trim() ?? "";
  if (!tail) return null;
  const words = tail.split(/\s+/);
  let known = "";
  for (let n = 1; n <= Math.min(words.length, 5); n++) {
    const candidate = words.slice(-n).join(" ");
    if (isKnownCategory(candidate)) known = candidate;
  }
  if (known) return known;
  for (let n = 1; n <= Math.min(words.length, 5); n++) {
    const candidate = words.slice(-n).join(" ");
    if (looksLikeCategoryHeading(candidate)) return candidate;
  }
  return null;
}

function parseLabelValueSkills(block: string): RecoveredSkillGroup[] {
  const groups: RecoveredSkillGroup[] = [];
  const found: Array<{ category: string; labelStart: number; valueStart: number }> = [];
  const re = /:\s*/g;
  let match = re.exec(block);
  while (match) {
    const category = categoryBeforeColon(block, match.index);
    if (category) {
      found.push({
        category,
        labelStart: match.index - category.length,
        valueStart: match.index + match[0].length,
      });
    }
    match = re.exec(block);
  }
  for (let i = 0; i < found.length; i++) {
    const valueEnd = i + 1 < found.length ? found[i + 1].labelStart : block.length;
    addGroup(groups, found[i].category, splitSkills(block.slice(found[i].valueStart, valueEnd)));
  }
  return groups;
}

function parseLineSkills(block: string): RecoveredSkillGroup[] {
  const groups: RecoveredSkillGroup[] = [];
  let current = "";
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (SKILLS_HEADING.test(line)) continue;
    if (SECTION_STOP.test(line)) break;

    const labelled = line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (labelled && looksLikeCategoryHeading(labelled[1])) {
      current = labelled[1];
      addGroup(groups, current, splitSkills(labelled[2]));
      continue;
    }

    if (looksLikeCategoryHeading(line)) {
      current = cleanCategory(line);
      addGroup(groups, current, []);
      continue;
    }

    if (current) addGroup(groups, current, splitSkills(line));
  }
  return groups.filter((group) => group.skills.length > 0);
}

function mergeRecovered(primary: RecoveredSkillGroup[], extra: RecoveredSkillGroup[]): RecoveredSkillGroup[] {
  const result = primary.map((group) => ({ ...group, skills: [...group.skills] }));
  for (const group of extra) addGroup(result, group.category, group.skills);
  return result;
}

export function recoverSkillsBounded(cvText: string): RecoveredSkillGroup[] {
  if (!cvText.trim()) return [];
  const block = isolateSkillsBlock(cvText);
  if (!block) return [];
  const labelled = parseLabelValueSkills(block);
  if (labelled.length && !block.includes("\n")) return labelled;
  return mergeRecovered(labelled, parseLineSkills(block));
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
