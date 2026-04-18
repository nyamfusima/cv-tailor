import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY;
const PRIMARY_RAPIDAPI_HOST =
  process.env.RAPIDAPI_JOBS_HOST ||
  process.env.RAPIDAPI_SALARY_HOST ||
  process.env.RAPIDAPI_HOST ||
  "jsearch.p.rapidapi.com";
const FALLBACK_RAPIDAPI_HOST = "jsearch.p.rapidapi.com";

type SearchOptions = {
  pages?: number;
  countryCode?: string | null;
  remoteOnly?: boolean;
};

type SearchAttempt = {
  endpoint: string;
  params: URLSearchParams;
};

type SearchAttemptResult = {
  ok: boolean;
  jobs: any[];
  error?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

type ParsedJobQuery = {
  primaryTitle: string;
  skills: string[];
};

type JobsCacheEntry = {
  jobs: any[];
  query: ParsedJobQuery;
  createdAt: number;
  expiresAt: number;
};

const JOBS_CACHE_TTL_MS = 5 * 60 * 1000;
const jobsCache = new Map<string, JobsCacheEntry>();

class RateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function sanitizeHost(rawHost: string): string {
  return rawHost.replace(/^https?:\/\//i, "").replace(/\/+$/g, "").trim();
}

// Minimal country lookup so we can bias results away from US by default.
const COUNTRY_MAP: Record<string, string> = {
  "united states": "us",
  usa: "us",
  us: "us",
  "united kingdom": "gb",
  uk: "gb",
  britain: "gb",
  england: "gb",
  canada: "ca",
  australia: "au",
  india: "in",
  "south africa": "za",
  nigeria: "ng",
  kenya: "ke",
  germany: "de",
  france: "fr",
  spain: "es",
  italy: "it",
  netherlands: "nl",
  ireland: "ie",
};

function countryFromLocation(location?: string): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(name)) return code;
  }

  // If the location already looks like a two-letter code, trust it.
  const codeMatch = lower.match(/\b[a-z]{2}\b/);
  return codeMatch ? codeMatch[0] : null;
}

const STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "at",
  "by",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function overlapRatio(source: string[], target: string[]): number {
  if (!source.length || !target.length) return 0;
  const targetSet = new Set(target);
  const overlap = source.filter((token) => targetSet.has(token)).length;
  return overlap / source.length;
}

function clampScore(score: number): number {
  return Math.max(35, Math.min(98, score));
}

function asRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
}

function buildJobsCacheKey(query: ParsedJobQuery, countryCode?: string | null): string {
  const normalizedSkills = query.skills
    .map((skill) => normalize(skill))
    .filter(Boolean)
    .sort()
    .slice(0, 8);

  return JSON.stringify({
    title: normalize(query.primaryTitle),
    skills: normalizedSkills,
    country: (countryCode || "global").toLowerCase(),
  });
}

function readJobsCache(cacheKey: string): JobsCacheEntry | null {
  const cached = jobsCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    jobsCache.delete(cacheKey);
    return null;
  }
  return cached;
}

function writeJobsCache(cacheKey: string, jobs: any[], query: ParsedJobQuery) {
  const now = Date.now();
  jobsCache.set(cacheKey, {
    jobs,
    query,
    createdAt: now,
    expiresAt: now + JOBS_CACHE_TTL_MS,
  });
}

function parseJsonFromText(value: string): unknown {
  const cleaned = value.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObject = cleaned.match(/\{[\s\S]*\}/);
    if (!firstObject) return null;
    try {
      return JSON.parse(firstObject[0]);
    } catch {
      return null;
    }
  }
}

function extractFallbackQuery(cv: any): ParsedJobQuery {
  const titleFromExperience = Array.isArray(cv?.experience)
    ? cv.experience.find((exp: { title?: string }) => Boolean(exp?.title))?.title
    : "";
  const titleFromSummary =
    typeof cv?.summary === "string" ? cv.summary.split(/[.\n,]/)[0]?.trim() : "";
  const primaryTitle =
    (titleFromExperience || titleFromSummary || "Professional").trim();

  const skills = Array.isArray(cv?.skills)
    ? cv.skills
        .flatMap((group: { skills?: string[] }) =>
          Array.isArray(group?.skills) ? group.skills : []
        )
        .map((skill: unknown) => String(skill).trim())
        .filter((skill: string) => Boolean(skill))
        .slice(0, 10)
    : [];

  return {
    primaryTitle,
    skills,
  };
}

function parseQueryPayload(rawText: string, cv: any): ParsedJobQuery {
  const fallback = extractFallbackQuery(cv);
  const parsed = parseJsonFromText(rawText);

  if (!parsed || typeof parsed !== "object") return fallback;

  const payload = parsed as Record<string, unknown>;
  const primaryTitle =
    typeof payload.primaryTitle === "string" && payload.primaryTitle.trim()
      ? payload.primaryTitle.trim()
      : fallback.primaryTitle;

  const skills = Array.isArray(payload.skills)
    ? payload.skills
        .map((s: unknown) => String(s).trim())
        .filter((s: string) => Boolean(s))
        .slice(0, 10)
    : fallback.skills;

  return { primaryTitle, skills };
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const direct = [obj.error, obj.message, obj.detail, obj.reason];
  for (const value of direct) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      const nested = first as Record<string, unknown>;
      const nestedMessage = nested.message || nested.error || nested.detail;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage.trim();
      }
    }
  }
  return null;
}

function extractJobsFromPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const prioritizedKeys = [
    "data",
    "jobs",
    "results",
    "items",
    "list",
    "job_results",
  ];

  for (const key of prioritizedKeys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of prioritizedKeys) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as any[];
      }
    }
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      return value;
    }
  }

  return [];
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return undefined;
  const lower = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(lower)) return true;
  if (["0", "false", "no", "n"].includes(lower)) return false;
  return undefined;
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const parsed = toBool(source[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function extractQualifications(job: Record<string, unknown>): string {
  const highlights = job.job_highlights ?? job.highlights;
  if (!highlights) return "";

  if (Array.isArray(highlights)) {
    return highlights.map((value) => String(value)).join(" ");
  }

  if (typeof highlights === "object") {
    return Object.values(highlights as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value))
      .join(" ");
  }

  return String(highlights);
}

function buildSearchAttempts(query: string, options: SearchOptions): SearchAttempt[] {
  const { pages = 1, countryCode, remoteOnly } = options;

  const attempts: SearchAttempt[] = [];

  const queryParams = new URLSearchParams({
    query,
    num_pages: pages.toString(),
  });
  if (countryCode) queryParams.set("country", countryCode.toLowerCase());
  if (remoteOnly) queryParams.set("remote_jobs_only", "true");
  attempts.push({ endpoint: "/search", params: queryParams });

  const qParams = new URLSearchParams({
    q: query,
    page: "1",
    pages: pages.toString(),
  });
  if (countryCode) qParams.set("country", countryCode.toLowerCase());
  if (remoteOnly) qParams.set("remote_only", "true");
  attempts.push({ endpoint: "/search", params: qParams });

  const titleParams = new URLSearchParams({
    job_title: query,
    page: "1",
    pages: pages.toString(),
  });
  if (countryCode) titleParams.set("location", countryCode.toUpperCase());
  if (remoteOnly) titleParams.set("remote_only", "true");
  attempts.push({ endpoint: "/search", params: titleParams });

  attempts.push({ endpoint: "/search-jobs", params: queryParams });
  attempts.push({ endpoint: "/jobs/search", params: queryParams });

  return attempts;
}

async function fetchSearchAttempt(
  host: string,
  apiKey: string,
  attempt: SearchAttempt,
): Promise<SearchAttemptResult> {
  const url = `https://${host}${attempt.endpoint}?${attempt.params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": host,
    },
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const retryAfterSeconds = asRetryAfterSeconds(res.headers.get("retry-after"));
    if (res.status === 429) {
      return {
        ok: false,
        jobs: [],
        rateLimited: true,
        retryAfterSeconds,
        error:
          extractErrorMessage(payload) ||
          "Rate limit reached while fetching job matches.",
      };
    }

    return {
      ok: false,
      jobs: [],
      retryAfterSeconds,
      error:
        extractErrorMessage(payload) ||
        `RapidAPI search request failed (${res.status})`,
    };
  }

  return {
    ok: true,
    jobs: extractJobsFromPayload(payload),
  };
}

async function searchJobs(query: string, options: SearchOptions = {}): Promise<any[]> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RapidAPI key is missing. Set RAPIDAPI_KEY in your environment.");
  }

  const hostCandidates = Array.from(
    new Set([
      sanitizeHost(PRIMARY_RAPIDAPI_HOST),
      sanitizeHost(FALLBACK_RAPIDAPI_HOST),
    ])
  ).filter(Boolean);

  const attempts = buildSearchAttempts(query, options);
  const seenUrls = new Set<string>();
  let hadSuccess = false;
  let lastError = "";

  for (const host of hostCandidates) {
    for (const attempt of attempts) {
      const dedupeKey = `${host}${attempt.endpoint}?${attempt.params.toString()}`;
      if (seenUrls.has(dedupeKey)) continue;
      seenUrls.add(dedupeKey);

      const result = await fetchSearchAttempt(host, RAPIDAPI_KEY, attempt);
      if (!result.ok) {
        if (result.rateLimited) {
          throw new RateLimitError(
            result.error || "Rate limit reached while fetching job matches.",
            result.retryAfterSeconds
          );
        }
        lastError = result.error || lastError;
        continue;
      }

      hadSuccess = true;
      if (result.jobs.length > 0) return result.jobs;
    }
  }

  if (hadSuccess) return [];
  throw new Error(lastError || "Failed to fetch jobs from RapidAPI.");
}

export async function POST(req: NextRequest) {
  try {
    const { cv, jobDescription } = await req.json();

    // Best-effort country detection (edge header first, then CV location)
    const headerCountry =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-country-code");
    const userCountry = (headerCountry || countryFromLocation(cv?.location))
      ?.toString()
      .toUpperCase() || null;

    // Step 1 - Extract search info from CV using Claude. Fall back if parsing fails.
    let jobQuery = extractFallbackQuery(cv);
    try {
      const queryMessage = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Based on this CV${jobDescription ? " and job description" : ""}, extract job search data.

CV Summary: ${cv.summary}
Skills: ${cv.skills?.map((g: any) => g.skills.join(", ")).join(", ")}
Experience: ${cv.experience?.map((e: any) => e.title).join(", ")}
${jobDescription ? `\nJob Description: ${jobDescription.slice(0, 500)}` : ""}

Return ONLY a JSON object, no markdown:
{
  "primaryTitle": "the single most fitting job title (e.g. 'Software Engineer', 'Marketing Manager')",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}`,
          },
        ],
      });

      const raw =
        queryMessage.content[0].type === "text" ? queryMessage.content[0].text : "";
      jobQuery = parseQueryPayload(raw, cv);
    } catch (queryError) {
      console.warn("Jobs API query extraction fallback:", queryError);
    }

    const cacheKey = buildJobsCacheKey(jobQuery, userCountry);
    const cachedJobs = readJobsCache(cacheKey);
    if (cachedJobs) {
      return NextResponse.json({
        jobs: cachedJobs.jobs,
        query: cachedJobs.query,
        cached: true,
      });
    }

    // Step 2 - Fetch jobs, prioritising user's country, with fallbacks.
    let rawJobs = await searchJobs(jobQuery.primaryTitle, {
      pages: 1,
      countryCode: userCountry,
    });

    // Fallback: strip seniority words and retry with just the core role.
    if (rawJobs.length === 0) {
      const broaderTitle = jobQuery.primaryTitle
        .replace(/\b(senior|junior|lead|principal|staff|associate|entry\.level)\b/gi, "")
        .trim();

      rawJobs = await searchJobs(broaderTitle || jobQuery.primaryTitle, {
        pages: 1,
        countryCode: userCountry,
      });
    }

    // Final fallback: remote roles so users always see something relevant.
    if (rawJobs.length === 0) {
      rawJobs = await searchJobs(jobQuery.primaryTitle, {
        pages: 1,
        remoteOnly: true,
      });
    }

    // Step 3 - Score each job against CV skills (lenient, includes related roles).
    const focusSkills: string[] = (Array.isArray(jobQuery.skills) ? jobQuery.skills : [])
      .map((s: unknown) => normalize(String(s)))
      .filter((s: string) => Boolean(s))
      .slice(0, 10);

    const cvSkills: string[] = (Array.isArray(cv?.skills) ? cv.skills : [])
      .flatMap((g: { skills?: string[] }) => (Array.isArray(g?.skills) ? g.skills : []))
      .map((s: unknown) => normalize(String(s)))
      .filter((s: string) => Boolean(s));

    const candidateSkills: string[] = Array.from(new Set<string>([...focusSkills, ...cvSkills])).slice(0, 20);
    const primaryTitle = typeof jobQuery.primaryTitle === "string" ? jobQuery.primaryTitle : "";
    const primaryTitleTokens = tokenize(primaryTitle);
    const experienceTitles: string[] = (Array.isArray(cv?.experience) ? cv.experience : [])
      .map((e: { title?: string }) => e?.title || "")
      .filter((title: string) => Boolean(title));

    const dedupeIds = new Set<string>();
    const scoredJobs = rawJobs
      .slice(0, 40)
      .map((rawJob: any, index: number) => {
        const job = (rawJob || {}) as Record<string, unknown>;
        const jobTitle =
          pickString(job, ["job_title", "title", "position", "role", "name"]) ||
          "Untitled role";
        const qualifications = extractQualifications(job);
        const jobDescriptionText =
          pickString(job, ["job_description", "description", "snippet", "summary"]) ||
          qualifications;

        const jobText = normalize(`${jobTitle} ${jobDescriptionText} ${qualifications}`);
        const jobTitleTokens = tokenize(jobTitle);

        const matchedSkills = candidateSkills.filter((s: string) => jobText.includes(s));
        const missingSkills = focusSkills.filter((s: string) => !jobText.includes(s));

        const skillCoverage = matchedSkills.length / Math.max(candidateSkills.length, 1);
        const titleOverlap = overlapRatio(primaryTitleTokens, jobTitleTokens);
        const experienceOverlap = experienceTitles.length
          ? Math.max(
              ...experienceTitles.map((title: string) =>
                overlapRatio(tokenize(title), jobTitleTokens)
              )
            )
          : 0;

        const weightedScore = skillCoverage * 60 + titleOverlap * 30 + experienceOverlap * 10;
        const titleBoost =
          titleOverlap >= 0.8 ? 12 : titleOverlap >= 0.55 ? 7 : titleOverlap >= 0.35 ? 3 : 0;
        const skillBoost =
          matchedSkills.length >= 8
            ? 8
            : matchedSkills.length >= 5
            ? 5
            : matchedSkills.length >= 3
            ? 2
            : 0;
        const dynamicFloor = titleOverlap >= 0.6 ? 68 : titleOverlap >= 0.35 ? 58 : 48;
        const matchScore = clampScore(
          Math.max(Math.round(weightedScore + titleBoost + skillBoost), dynamicFloor)
        );

        const isRemote =
          pickBoolean(job, [
            "job_is_remote",
            "is_remote",
            "remote",
            "remote_only",
          ]) ?? false;

        const city = pickString(job, ["job_city", "city"]);
        const stateOrRegion = pickString(job, ["job_state", "state", "region"]);
        const country = pickString(job, ["job_country", "country", "country_code"]);
        const explicitLocation = pickString(job, [
          "job_location",
          "location",
          "candidate_required_location",
        ]);
        const location =
          explicitLocation ||
          [city, stateOrRegion, country].filter(Boolean).join(", ") ||
          (isRemote ? "Remote" : "Location not specified");

        const company = pickString(job, [
          "employer_name",
          "company",
          "company_name",
          "organization",
        ]) || "Company not listed";

        const derivedId =
          pickString(job, ["job_id", "id", "uuid", "listing_id"]) ||
          `job-${normalize(`${jobTitle}-${company}-${location}` || `${index}`)}-${index}`;

        if (dedupeIds.has(derivedId)) return null;
        dedupeIds.add(derivedId);

        return {
          id: derivedId,
          title: jobTitle,
          company,
          location,
          isRemote,
          applyUrl:
            pickString(job, [
              "job_apply_link",
              "apply_url",
              "apply_link",
              "url",
              "link",
              "job_google_link",
            ]) || "#",
          postedAt: pickString(job, [
            "job_posted_at_datetime_utc",
            "posted_at",
            "date_posted",
            "created_at",
          ]),
          matchScore,
          matchedSkills: matchedSkills.slice(0, 6),
          missingSkills: missingSkills.slice(0, 4),
          description: jobDescriptionText
            ? `${jobDescriptionText.slice(0, 300)}...`
            : "No description provided.",
        };
      })
      .filter(Boolean);

    const sorted = scoredJobs
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 20);

    writeJobsCache(cacheKey, sorted, jobQuery);

    return NextResponse.json({ jobs: sorted, query: jobQuery });
  } catch (err: any) {
    console.error("Jobs API error:", err);

    if (err instanceof RateLimitError) {
      const retryMessage =
        err.retryAfterSeconds && err.retryAfterSeconds > 0
          ? ` Please wait about ${err.retryAfterSeconds} seconds and try again.`
          : " Please wait a minute and try again.";

      return NextResponse.json(
        {
          error: `Job search is temporarily rate-limited.${retryMessage}`,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs." },
      { status: 500 }
    );
  }
}
