import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,ngqongwaayandisa@gmail.com,zengetwasisipho@gmail.com")
  .split(",").map(e => e.trim());

const client = new OpenAI();

const RAPIDAPI_KEY = process.env.RAPIDAPI_JOB_MATCH_KEY || process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY;
const RAPIDAPI_HOST = "jsearch.p.rapidapi.com";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  const stop = new Set(["and", "or", "the", "a", "an", "of", "for", "to", "in", "on", "with", "at", "by"]);
  return normalize(text).split(" ").filter(t => t.length > 1 && !stop.has(t));
}

function overlapRatio(src: string[], tgt: string[]): number {
  if (!src.length || !tgt.length) return 0;
  const s = new Set(tgt);
  return src.filter(t => s.has(t)).length / src.length;
}

function clamp(n: number) { return Math.max(35, Math.min(98, n)); }

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractJobs(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const k of ["data", "jobs", "results", "items", "list"]) {
    if (Array.isArray(obj[k])) return obj[k] as any[];
  }
  return [];
}

function guessCountry(location: string): string | null {
  const map: Record<string, string> = {
    "south africa": "za", "united states": "us", usa: "us",
    "united kingdom": "gb", uk: "gb", australia: "au", canada: "ca",
    nigeria: "ng", kenya: "ke", germany: "de", france: "fr",
  };
  const lower = location.toLowerCase();
  for (const [name, code] of Object.entries(map)) {
    if (lower.includes(name)) return code;
  }
  return null;
}

async function searchRapidAPI(query: string, countryCode: string | null): Promise<any[]> {
  if (!RAPIDAPI_KEY) {
    console.error("[job-match] RAPIDAPI_KEY is not set — check RAPIDAPI_JOB_MATCH_KEY or RAPIDAPI_KEY env vars");
    return [];
  }

  const headers = { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST };
  let jobs: any[] = [];

  // Attempt 1: /search endpoint
  const p1 = new URLSearchParams({ query, num_pages: "2", page: "1" });
  if (countryCode) p1.set("country", countryCode.toLowerCase());
  const url1 = `https://${RAPIDAPI_HOST}/search?${p1}`;
  console.log(`[job-match] RapidAPI attempt 1: GET ${url1}`);
  const r1 = await fetch(url1, { headers, cache: "no-store" });
  console.log(`[job-match] RapidAPI attempt 1 status: ${r1.status}`);
  if (r1.ok) {
    jobs = extractJobs(await r1.json());
    console.log(`[job-match] Attempt 1 returned ${jobs.length} jobs`);
  } else {
    const body = await r1.text().catch(() => "");
    console.warn(`[job-match] Attempt 1 failed: ${r1.status} — ${body.slice(0, 200)}`);
  }

  // Attempt 2: /job-search endpoint if first gave few results
  if (jobs.length < 5) {
    const p2 = new URLSearchParams({ keyword: query, num_pages: "2", page: "1" });
    if (countryCode) p2.set("country", countryCode.toLowerCase());
    const url2 = `https://${RAPIDAPI_HOST}/job-search?${p2}`;
    console.log(`[job-match] RapidAPI attempt 2: GET ${url2}`);
    const r2 = await fetch(url2, { headers, cache: "no-store" });
    console.log(`[job-match] RapidAPI attempt 2 status: ${r2.status}`);
    if (r2.ok) {
      const extra = extractJobs(await r2.json());
      console.log(`[job-match] Attempt 2 returned ${extra.length} jobs`);
      const seen = new Set(jobs.map((j: any) => j.job_id || j.id));
      jobs = [...jobs, ...extra.filter((j: any) => !seen.has(j.job_id || j.id))];
    } else {
      const body = await r2.text().catch(() => "");
      console.warn(`[job-match] Attempt 2 failed: ${r2.status} — ${body.slice(0, 200)}`);
    }
  }

  return jobs;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[job-match] Unauthorized — no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) {
      const userData = await getUserCredits(user.id);
      if (!userData || !hasJobCredits(userData)) {
        console.log(`[job-match] Access denied for ${user.email} — no job credits`);
        return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
      }
    }

    const { cvText } = await req.json();
    if (!cvText || typeof cvText !== "string") {
      console.log("[job-match] Missing or invalid cvText in request body");
      return NextResponse.json({ error: "cvText is required" }, { status: 400 });
    }

    console.log(`[job-match] Request from user ${user.id} (admin=${isAdmin}), cvText length: ${cvText.length}`);

    if (!RAPIDAPI_KEY) {
      console.error("[job-match] No RapidAPI key configured");
      return NextResponse.json({ error: "Job search is not configured." }, { status: 500 });
    }

    // Step 1: Extract job query from raw CV text
    let primaryTitle = "Professional";
    let skills: string[] = [];
    let location: string | null = null;

    console.log("[job-match] Step 1: Extracting job query from CV with OpenAI...");
    try {
      const msg = await client.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 512,
        messages: [{
          role: "user",
          content: `Extract job search data from this CV. Return ONLY valid JSON, no markdown:
{"primaryTitle":"most fitting current job title","skills":["skill1","skill2","skill3","skill4","skill5"],"location":"city or country string, or null"}

CV (first 3000 chars):
${cvText.slice(0, 3000)}`,
        }],
      });
      const raw = msg.choices[0]?.message?.content ?? "";
      const match = raw.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.primaryTitle) primaryTitle = String(parsed.primaryTitle);
        if (Array.isArray(parsed.skills)) skills = parsed.skills.map(String).slice(0, 10);
        if (typeof parsed.location === "string" && parsed.location !== "null") location = parsed.location;
      }
      console.log(`[job-match] OpenAI extracted: title="${primaryTitle}", skills=[${skills.join(", ")}], location="${location}"`);
    } catch (e: any) {
      console.warn("[job-match] OpenAI extraction failed, using defaults:", e?.message);
    }

    // Step 2: Detect country from request header or CV location
    const headerCountry = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry");
    const countryCode = headerCountry || (location ? guessCountry(location) : null);
    console.log(`[job-match] Step 2: Searching RapidAPI for "${primaryTitle}", country="${countryCode ?? "any"}"`);

    const rawJobs = await searchRapidAPI(primaryTitle, countryCode);
    console.log(`[job-match] Total raw jobs from RapidAPI: ${rawJobs.length}`);

    // Step 3: Score each job against extracted skills and title
    const titleTokens = tokenize(primaryTitle);
    const skillNorms = skills.map(s => normalize(s));
    const dedupeIds = new Set<string>();

    const scored = rawJobs.slice(0, 40).map((rawJob: any, idx: number) => {
      const job = (rawJob || {}) as Record<string, unknown>;
      const title = pick(job, ["job_title", "title", "position", "role"]) || "Untitled role";
      const desc = pick(job, ["job_description", "description", "snippet", "summary"]);
      const qualText = (() => {
        const h = job.job_highlights ?? job.highlights;
        if (!h) return "";
        if (Array.isArray(h)) return h.join(" ");
        if (typeof h === "object") return Object.values(h as Record<string, unknown>).flat().join(" ");
        return String(h);
      })();
      const jobText = normalize(`${title} ${desc} ${qualText}`);
      const jobTitleTokens = tokenize(title);

      const matched = skillNorms.filter(s => jobText.includes(s));
      const missing = skillNorms.filter(s => !jobText.includes(s));
      const skillCoverage = matched.length / Math.max(skillNorms.length, 1);
      const titleOverlap = overlapRatio(titleTokens, jobTitleTokens);
      const floor = titleOverlap >= 0.6 ? 68 : titleOverlap >= 0.35 ? 58 : 48;
      const boost = titleOverlap >= 0.8 ? 12 : titleOverlap >= 0.55 ? 7 : titleOverlap >= 0.35 ? 3 : 0;
      const matchScore = clamp(Math.max(Math.round(skillCoverage * 60 + titleOverlap * 30 + boost), floor));

      const company = pick(job, ["employer_name", "company", "company_name", "organization"]) || "Company not listed";
      const city = pick(job, ["job_city", "city"]);
      const country = pick(job, ["job_country", "country", "country_code"]);
      const isRemote = !!(job.job_is_remote || job.is_remote || job.remote);
      const loc = pick(job, ["job_location", "location", "candidate_required_location"]) ||
        [city, country].filter(Boolean).join(", ") ||
        (isRemote ? "Remote" : "");

      const id = pick(job, ["job_id", "id", "uuid"]) || `job-${idx}`;
      if (dedupeIds.has(id)) return null;
      dedupeIds.add(id);

      return {
        id,
        title,
        company,
        location: loc,
        isRemote,
        applyUrl: pick(job, ["job_apply_link", "job_url", "apply_url", "url", "job_google_link"]) || "#",
        postedAt: pick(job, ["job_posted_at_datetime_utc", "posted_at", "date_posted", "posted_date"]),
        matchScore,
        matchedSkills: matched.slice(0, 6),
        missingSkills: missing.slice(0, 4),
        description: desc ? `${desc.slice(0, 300)}...` : "No description provided.",
      };
    }).filter(Boolean);

    const jobs = scored
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 20);

    console.log(`[job-match] Step 3: Returning ${jobs.length} scored jobs`);
    return NextResponse.json({ jobs, query: { primaryTitle, skills } });
  } catch (err: any) {
    console.error("[job-match] Unhandled error:", err?.message ?? err);
    return NextResponse.json({ error: err.message || "Failed to fetch jobs." }, { status: 500 });
  }
}
