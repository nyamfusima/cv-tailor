import { extractKeywords } from "./matchScore";
import type { CanonicalCV, CanonicalExperience, CanonicalProject } from "./types";

export interface DisplaySelection {
  experienceBulletIds: Record<string, string[]>;
  projectIds: string[];
  approved: boolean;
}

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((sum, key) => sum + (lower.includes(key) ? 1 : 0), 0);
}

function limitsForRank(rank: number, total: number): { min: number; max: number } {
  if (rank === 0) return { min: 4, max: 6 };
  if (rank === 1 && total > 1) return { min: 3, max: 5 };
  return { min: 2, max: 3 };
}

export function recommendDisplaySelection(
  source: CanonicalCV,
  jobDescription: string,
): DisplaySelection {
  const keywords = extractKeywords(jobDescription);
  const ranked = source.experience
    .map((job, index) => ({
      job,
      index,
      score: scoreText([job.title, job.company, ...job.sourceBullets.map((b) => b.text)].join(" "), keywords),
    }))
    .sort((a, b) => b.score - a.score);

  const experienceBulletIds: Record<string, string[]> = {};
  ranked.forEach((entry, rank) => {
    const { min, max } = limitsForRank(rank, ranked.length);
    const scored = entry.job.sourceBullets
      .map((bullet) => ({ bullet, score: scoreText(bullet.text, keywords) }))
      .sort((a, b) => b.score - a.score);
    const keep = Math.min(Math.max(min, Math.min(max, scored.length)), scored.length);
    const selected = scored.slice(0, keep).map((row) => row.bullet.id);
    const originalOrder = entry.job.sourceBullets.map((b) => b.id).filter((id) => selected.includes(id));
    experienceBulletIds[entry.job.id] = originalOrder.length ? originalOrder : entry.job.sourceBullets.slice(0, keep).map((b) => b.id);
  });

  const projects = [...source.projects]
    .map((project) => ({
      project,
      score: scoreText([project.name, project.description, ...project.technologies].join(" "), keywords),
    }))
    .sort((a, b) => b.score - a.score);
  const projectKeep = Math.min(3, Math.max(2, projects.length));
  const projectIds = projects.slice(0, projectKeep).map((row) => row.project.id);

  return { experienceBulletIds, projectIds, approved: false };
}

export function applyDisplaySelection<T extends { id?: string; bullets?: string[]; sourceBullets?: Array<{ id: string; text: string }> }>(
  jobs: T[],
  selection: DisplaySelection,
): T[] {
  return jobs.map((job) => {
    const ids = job.id ? selection.experienceBulletIds[job.id] : undefined;
    if (!ids?.length) return job;
    const byId = new Map((job.sourceBullets ?? []).map((b) => [b.id, b.text]));
    const bullets = ids.map((id) => byId.get(id)).filter((text): text is string => Boolean(text));
    return { ...job, bullets: bullets.length ? bullets : job.bullets };
  });
}

export function applyProjectSelection(projects: CanonicalProject[], selection: DisplaySelection): CanonicalProject[] {
  if (!selection.projectIds.length) return projects;
  const allowed = new Set(selection.projectIds);
  return projects.filter((project) => allowed.has(project.id));
}

export function displayedExperience(job: CanonicalExperience, selection?: DisplaySelection): string[] {
  if (!selection) return job.bullets;
  const ids = selection.experienceBulletIds[job.id];
  if (!ids?.length) return job.bullets;
  const byId = new Map(job.sourceBullets.map((b) => [b.id, b.text]));
  const fromSource = ids.map((id) => byId.get(id)).filter((text): text is string => Boolean(text));
  if (fromSource.length) return fromSource;
  return job.bullets.filter((_, i) => ids.includes(job.sourceBullets[i]?.id));
}
