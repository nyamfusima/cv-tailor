import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const RAPIDAPI_HEADERS = {
  "X-RapidAPI-Key": process.env.RAPID_API_KEY!,
  "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
};

async function searchJobs(query: string, pages = 1): Promise<any[]> {
  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=${pages}`,
    { headers: RAPIDAPI_HEADERS }
  );
  const data = await res.json();
  return data.data || [];
}

export async function POST(req: NextRequest) {
  try {
    const { cv, jobDescription } = await req.json();

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

    // Step 2 — Fetch jobs, with fallback to broader title if first attempt returns nothing
    let rawJobs = await searchJobs(jobQuery.primaryTitle, 2);

    // Fallback: strip seniority words and retry with just the core role
    if (rawJobs.length === 0) {
      const broaderTitle = jobQuery.primaryTitle
        .replace(/\b(senior|junior|lead|principal|staff|associate|entry.level)\b/gi, "")
        .trim();
      rawJobs = await searchJobs(broaderTitle, 2);
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
      const raw = Math.round((matchedSkills.length / Math.max(userSkills.length, 1)) * 100);
      const matchScore = Math.max(raw, 40);

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
