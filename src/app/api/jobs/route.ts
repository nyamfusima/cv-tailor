import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const RAPIDAPI_HEADERS = {
  "X-RapidAPI-Key": process.env.RAPID_API_KEY!,
  "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
};

type SearchOptions = {
  pages?: number;
  countryCode?: string | null;
  remoteOnly?: boolean;
};

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

async function searchJobs(query: string, options: SearchOptions = {}): Promise<any[]> {
  const { pages = 1, countryCode, remoteOnly } = options;

  const params = new URLSearchParams({
    query,
    num_pages: pages.toString(),
  });

  if (countryCode) params.set("country", countryCode);
  if (remoteOnly) params.set("remote_jobs_only", "true");

  const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
    headers: RAPIDAPI_HEADERS,
  });

  const data = await res.json();
  return data.data || [];
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

    // Step 1 — Extract job search info from CV using Claude
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

    const raw = queryMessage.content[0].type === "text" ? queryMessage.content[0].text : "";
    const jobQuery = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Step 2 — Fetch jobs, prioritising user's country, with fallbacks
    let rawJobs = await searchJobs(jobQuery.primaryTitle, {
      pages: 2,
      countryCode: userCountry,
    });

    // Fallback: strip seniority words and retry with just the core role
    if (rawJobs.length === 0) {
      const broaderTitle = jobQuery.primaryTitle
        .replace(/\b(senior|junior|lead|principal|staff|associate|entry\.level)\b/gi, "")
        .trim();

      rawJobs = await searchJobs(broaderTitle, {
        pages: 2,
        countryCode: userCountry,
      });
    }

    // Final fallback: remote roles so users always see something relevant
    if (rawJobs.length === 0) {
      rawJobs = await searchJobs(jobQuery.primaryTitle, {
        pages: 2,
        remoteOnly: true,
      });
    }

    // Step 3 — Score each job against CV skills (lenient — show any related role)
    const userSkills = (jobQuery.skills as string[]).map((s) => s.toLowerCase());

    const scoredJobs = rawJobs.slice(0, 20).map((job: any) => {
      const jobText = `${job.job_title} ${job.job_description || ""} ${
        job.job_highlights?.Qualifications?.join(" ") || ""
      }`.toLowerCase();

      const matchedSkills = userSkills.filter((s) => jobText.includes(s));
      const missingSkills = userSkills.filter((s) => !jobText.includes(s));

      // Score based on skill overlap, but floor at 40 so all results are visible
      const rawScore = Math.round((matchedSkills.length / Math.max(userSkills.length, 1)) * 100);
      const matchScore = Math.max(rawScore, 40);

      return {
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city
          ? `${job.job_city}, ${job.job_country}`
          : job.job_is_remote
          ? "Remote"
          : job.job_country,
        isRemote: job.job_is_remote,
        applyUrl: job.job_apply_link,
        postedAt: job.job_posted_at_datetime_utc,
        matchScore,
        matchedSkills: matchedSkills.slice(0, 5),
        missingSkills: missingSkills.slice(0, 3),
        description: job.job_description?.slice(0, 300) + "...",
      };
    });

    const sorted = scoredJobs.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({ jobs: sorted, query: jobQuery });
  } catch (err: any) {
    console.error("Jobs API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs." },
      { status: 500 }
    );
  }
}
