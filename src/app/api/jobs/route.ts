import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { cv, jobDescription } = await req.json();

    // Step 1 — Extract job query from CV using Claude
    const queryMessage = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Based on this CV${jobDescription ? " and job description" : ""}, extract the best job search query.

CV Summary:
${cv.summary}

Skills: ${cv.skills?.map((g: any) => g.skills.join(", ")).join(", ")}

Experience: ${cv.experience?.map((e: any) => e.title).join(", ")}
${jobDescription ? `\nJob Description Context: ${jobDescription.slice(0, 500)}` : "\nFind the most suitable jobs based solely on the CV."}

Return ONLY a JSON object, no extra text, no markdown:
{
  "query": "main job title + remote or location",
  "location": "Remote or city name",
  "titles": ["Job Title 1", "Job Title 2", "Job Title 3"],
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}`,
        },
      ],
    });

    const rawQuery = queryMessage.content[0].type === "text"
      ? queryMessage.content[0].text
      : "";
    const jobQuery = JSON.parse(rawQuery.replace(/```json|```/g, "").trim());

    // Step 2 — Fetch real jobs from JSearch
    const searchQuery = encodeURIComponent(`${jobQuery.query}`);
    const jobsRes = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${searchQuery}&num_pages=2&date_posted=month`,
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPID_API_KEY!,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      }
    );

    const jobsData = await jobsRes.json();
    const rawJobs = jobsData.data || [];

    // Step 3 — Score each job against CV skills
    const userSkills = jobQuery.skills.map((s: string) => s.toLowerCase());

    const scoredJobs = rawJobs.slice(0, 20).map((job: any) => {
      const jobText = `${job.job_title} ${job.job_description || ""} ${job.job_highlights?.Qualifications?.join(" ") || ""}`.toLowerCase();

      const matchedSkills = userSkills.filter((skill: string) =>
        jobText.includes(skill.toLowerCase())
      );

      const missingSkills = userSkills.filter((skill: string) =>
        !jobText.includes(skill.toLowerCase())
      );

      const score = Math.round((matchedSkills.length / Math.max(userSkills.length, 1)) * 100);

      return {
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city
          ? `${job.job_city}, ${job.job_country}`
          : job.job_is_remote ? "Remote" : job.job_country,
        isRemote: job.job_is_remote,
        applyUrl: job.job_apply_link,
        postedAt: job.job_posted_at_datetime_utc,
        matchScore: Math.max(score, 30), // minimum 30% to show
        matchedSkills: matchedSkills.slice(0, 5),
        missingSkills: missingSkills.slice(0, 3),
        description: job.job_description?.slice(0, 300) + "...",
      };
    });

    // Sort by match score
    const sorted = scoredJobs.sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({
      jobs: sorted,
      query: jobQuery,
    });
  } catch (err: any) {
    console.error("Jobs API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs." },
      { status: 500 }
    );
  }
}