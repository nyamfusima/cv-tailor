import { normalizeKey } from "./json";
import { unionSkillGroups } from "./skillsBounds";
import type { CanonicalCV, CanonicalSkillGroup } from "./types";

interface SkillCatalogEntry {
  name: string;
  category: string;
  aliases: string[];
}

const SKILL_CATALOG: SkillCatalogEntry[] = [
  { name: "Python", category: "Programming Languages", aliases: ["python"] },
  { name: "Java", category: "Programming Languages", aliases: ["java"] },
  { name: "TypeScript", category: "Programming Languages", aliases: ["typescript"] },
  { name: "JavaScript", category: "Programming Languages", aliases: ["javascript"] },
  { name: "SQL", category: "Programming Languages", aliases: ["sql"] },
  { name: "Go", category: "Programming Languages", aliases: ["go", "golang"] },
  { name: "C#", category: "Programming Languages", aliases: ["c#", "csharp"] },
  { name: "C++", category: "Programming Languages", aliases: ["c++"] },
  { name: "FastAPI", category: "Backend", aliases: ["fastapi"] },
  { name: "REST APIs", category: "Backend", aliases: ["rest apis", "rest api", "rest"] },
  { name: "PostgreSQL", category: "Backend", aliases: ["postgresql", "postgres"] },
  { name: "MySQL", category: "Backend", aliases: ["mysql"] },
  { name: "Supabase", category: "Backend", aliases: ["supabase"] },
  { name: "Node.js", category: "Backend", aliases: ["node.js", "nodejs", "node"] },
  { name: "Express", category: "Backend", aliases: ["express", "express.js"] },
  { name: "GraphQL", category: "Backend", aliases: ["graphql"] },
  { name: "Django", category: "Backend", aliases: ["django"] },
  { name: "Flask", category: "Backend", aliases: ["flask"] },
  { name: "React", category: "Frontend", aliases: ["react"] },
  { name: "Next.js", category: "Frontend", aliases: ["next.js", "nextjs"] },
  { name: "Vue", category: "Frontend", aliases: ["vue", "vue.js"] },
  { name: "HTML", category: "Frontend", aliases: ["html"] },
  { name: "CSS", category: "Frontend", aliases: ["css"] },
  { name: "Tailwind", category: "Frontend", aliases: ["tailwind", "tailwindcss"] },
  { name: "Microsoft Azure", category: "Cloud", aliases: ["microsoft azure", "azure"] },
  { name: "AWS", category: "Cloud", aliases: ["aws", "amazon web services"] },
  { name: "Google Cloud", category: "Cloud", aliases: ["gcp", "google cloud"] },
  { name: "Kubernetes", category: "Cloud", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform", category: "Cloud", aliases: ["terraform"] },
  { name: "Docker", category: "Developer Tools", aliases: ["docker"] },
  { name: "Git", category: "Developer Tools", aliases: ["git"] },
  { name: "Linux", category: "Developer Tools", aliases: ["linux"] },
  { name: "VS Code", category: "Developer Tools", aliases: ["vs code", "vscode"] },
  { name: "Cursor", category: "Developer Tools", aliases: ["cursor"] },
  { name: "CI/CD", category: "Developer Tools", aliases: ["ci/cd", "cicd", "continuous integration"] },
  { name: "Retrieval-augmented generation", category: "AI", aliases: ["retrieval-augmented generation", "rag"] },
  { name: "Speech recognition", category: "AI", aliases: ["speech recognition"] },
  { name: "Embeddings", category: "Vector / NLP", aliases: ["embeddings", "embedding"] },
  { name: "NLP", category: "Vector / NLP", aliases: ["nlp", "natural language processing"] },
  { name: "Pandas", category: "Data & ETL", aliases: ["pandas"] },
  { name: "ETL", category: "Data & ETL", aliases: ["etl", "data pipelines", "data pipeline"] },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTerm(haystack: string, term: string): boolean {
  const needle = normalizeKey(term);
  if (!needle) return false;
  return new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(needle)}([^a-z0-9+#]|$)`, "i").test(haystack);
}

export function sourceEvidenceText(source: CanonicalCV): string {
  return [
    ...source.experience.flatMap((job) => [job.title, job.company, ...job.sourceBullets.map((b) => b.text)]),
    ...source.projects.flatMap((project) => [project.name, project.description, ...project.technologies]),
    ...source.skills.flatMap((group) => group.skills.map((skill) => skill.name)),
    ...source.education.flatMap((edu) => edu.coursework.map((item) => item.text)),
  ]
    .join("\n")
    .toLowerCase();
}

export function extractJobSkillTerms(jobDescription: string): string[] {
  const jd = normalizeKey(jobDescription);
  const found: string[] = [];
  const seen = new Set<string>();
  for (const entry of SKILL_CATALOG) {
    if (entry.aliases.some((alias) => hasTerm(jd, alias))) {
      const key = normalizeKey(entry.name);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(entry.name);
    }
  }
  return found;
}

function existingSkillKeys(groups: CanonicalSkillGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.skills.map((skill) => normalizeKey(skill.name))));
}

function findGroup(groups: CanonicalSkillGroup[], category: string): CanonicalSkillGroup | undefined {
  const key = normalizeKey(category);
  return groups.find((group) => normalizeKey(group.category) === key);
}

function catalogFor(name: string): SkillCatalogEntry | undefined {
  const key = normalizeKey(name);
  return SKILL_CATALOG.find((entry) => normalizeKey(entry.name) === key || entry.aliases.includes(key));
}

/** True when a catalog canonical name (e.g. "Microsoft Azure") is evidenced by an alias in source text ("Azure"). */
export function catalogSkillMatchesSourceText(skillName: string, sourceText: string): boolean {
  const key = normalizeKey(skillName);
  const blob = sourceText.toLowerCase();
  if (!key) return false;
  if (blob.includes(key)) return true;
  const entry = catalogFor(skillName);
  if (!entry) return false;
  return entry.aliases.some((alias) => hasTerm(blob, alias)) || hasTerm(blob, entry.name);
}

function nextPromotedId(groups: CanonicalSkillGroup[], prefix: string): string {
  const used = new Set(groups.flatMap((group) => [group.id, ...group.skills.map((skill) => skill.id)]));
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

/**
 * Add KEY SKILLS entries for tools already evidenced in experience or projects
 * when those tools also appear in the job description. Never invent a tool.
 */
export function promoteEvidencedJobSkills(source: CanonicalCV, tailored: CanonicalCV, jobDescription: string): CanonicalCV {
  const evidence = sourceEvidenceText(source);
  const wanted = extractJobSkillTerms(jobDescription);
  const groups = tailored.skills.map((group) => ({
    ...group,
    skills: group.skills.map((skill) => ({ ...skill })),
  }));
  const present = existingSkillKeys(groups);

  for (const name of wanted) {
    if (present.has(normalizeKey(name))) continue;
    const entry = catalogFor(name);
    if (!entry) continue;
    const evidenced = entry.aliases.some((alias) => hasTerm(evidence, alias)) || hasTerm(evidence, entry.name);
    if (!evidenced) continue;

    let group = findGroup(groups, entry.category);
    if (!group) {
      group = {
        id: nextPromotedId(groups, "skill-group-promoted"),
        category: entry.category,
        skills: [],
      };
      groups.push(group);
    }
    group.skills.push({
      id: nextPromotedId(groups, `${group.id}-promoted`),
      name: entry.name,
    });
    present.add(normalizeKey(entry.name));
  }

  const jd = normalizeKey(jobDescription);
  const rankedGroups = [...groups].sort((a, b) => groupScore(b, jd) - groupScore(a, jd));
  for (const group of rankedGroups) {
    group.skills.sort((a, b) => Number(hasTerm(jd, b.name)) - Number(hasTerm(jd, a.name)));
  }

  return { ...tailored, skills: unionSkillGroups(source.skills, rankedGroups) };
}

function groupScore(group: CanonicalSkillGroup, jd: string): number {
  return group.skills.reduce((sum, skill) => sum + (hasTerm(jd, skill.name) ? 2 : 0), 0);
}

export function evidencedSkillCorpus(cv: CanonicalCV): string {
  return [
    ...cv.skills.flatMap((group) => group.skills.map((skill) => skill.name)),
    ...cv.projects.flatMap((project) => project.technologies),
  ].join(" ");
}
