import { isEmptyCourseworkLabel } from "./courseworkBounds";

export function stripBulletPrefix(text: string): string {
  return text.replace(/^\s*[•\-\*]\s+/, "").trim();
}

export function isSkillsHeadingLabel(label: string | undefined): boolean {
  return /^(key\s+)?skills\s*:?\s*$/i.test((label ?? "").trim());
}

export function visibleSkillGroups<T extends { category: string }>(groups: T[] | undefined): T[] {
  return (groups ?? []).filter((group) => !isSkillsHeadingLabel(group.category));
}

export function skillCategoryLabel(category: string): string | undefined {
  if (isSkillsHeadingLabel(category)) return undefined;
  const trimmed = category.trim().replace(/:+\s*$/, "");
  return trimmed ? `${trimmed}:` : undefined;
}

export function filterCourseworkLabels(items: string[] | undefined): string[] {
  return (items ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !isEmptyCourseworkLabel(item));
}
