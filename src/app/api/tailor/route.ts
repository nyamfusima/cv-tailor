import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserData, incrementTailorCount, canTailor } from "@/lib/user";

const client = new Anthropic();

async function callAI(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function POST(req: NextRequest) {
  try {
    // Check auth
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check usage limit for logged in users
      const userData = await getUserData(user.id);
      if (userData && !canTailor(userData)) {
        return NextResponse.json(
          {
            error: "LIMIT_REACHED",
            message: "You've used all 3 free tailors this month. Upgrade to Pro for unlimited tailoring.",
          },
          { status: 403 }
        );
      }
    }

    const formData = await req.formData();
    const cvFile = formData.get("cv") as File;
    const jobDescription = formData.get("jobDescription") as string;

    if (!cvFile || !jobDescription) {
      return NextResponse.json(
        { error: "Missing CV file or job description." },
        { status: 400 }
      );
    }

    const cvText = await parseFile(cvFile);

    const originalPrompt = `Extract and structure the following CV text into a clean JSON object. Do not change, rewrite, or improve any content — preserve everything exactly as written.

<cv>
${cvText}
</cv>

Return ONLY a JSON object in this exact format, no extra text, no markdown fences:
{
  "name": "Full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "linkedin": "linkedin url or empty string",
  "summary": "professional summary exactly as written",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "dates": "Start – End",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "Institution name",
      "dates": "Year or date range",
      "coursework": ["course 1", "course 2"]
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing body",
      "date": "Year or Month Year"
    }
  ],
  "skills": [
    {
      "category": "Category name",
      "skills": ["skill1", "skill2"]
    }
  ]
}`;

    const tailorPrompt = `You are an aggressive, expert CV rewriter and ATS specialist. Your job is to COMPLETELY TRANSFORM the candidate's CV to match the job description as closely as possible. You are not a passive editor — you are a ruthless rewriter.

Here is the candidate's current CV:
<cv>
${cvText}
</cv>

Here is the job description they are applying for:
<job_description>
${jobDescription}
</job_description>

YOUR RULES — follow these without exception:

1. **Rewrite every bullet point** to use the exact language, keywords, and phrases from the job description. Do not keep original wording if better wording exists in the job description.
2. **Rewrite the summary completely** — it must read as if this person was born to do this specific job. Use the job title, the company's language, and mirror their priorities directly.
3. **Reorder experience bullets** — most relevant to the job description goes first. Bury or cut bullets that are irrelevant.
4. **Inject keywords aggressively** — scan the job description for every technical skill, tool, methodology, and buzzword. If the candidate has touched anything related, name it explicitly using the job description's exact terminology.
5. **Reframe job titles and responsibilities** — if the candidate was a "developer" but the job says "engineer", use "engineer". If they built "websites" but the job says "scalable web applications", say "scalable web applications".
6. **Skills section** — reorder categories and skills so the most job-relevant ones appear first. Add any skills mentioned in the job description that are clearly implied by the candidate's experience.
7. **Never invent qualifications, companies, or degrees** — you can reframe and strengthen real experience, but do not fabricate.
8. **The matchScore must reflect YOUR rewrite** — after your aggressive rewrite, the score should be 75 or above in almost all cases.
9. **Certifications** — extract any certificates or credentials from the CV. Do not invent any.
10. **Education coursework** — list relevant coursework based on the job description if the candidate's field of study supports it.
11. **Score breakdown** — provide honest before/after scores for each dimension.

Return ONLY a JSON object in this exact format, no extra text, no markdown fences:
{
  "name": "Full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "linkedin": "linkedin url or empty string",
  "summary": "aggressively tailored professional summary",
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "dates": "Start – End",
      "bullets": ["rewritten bullet 1", "rewritten bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree or qualification name",
      "institution": "Institution name",
      "dates": "Year or Start – Present if still studying",
      "coursework": ["Relevant Course 1", "Relevant Course 2"]
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing body",
      "date": "Year or Month Year"
    }
  ],
  "skills": [
    {
      "category": "Category name",
      "skills": ["skill1", "skill2"]
    }
  ],
  "matchScore": 85,
  "scoreBreakdown": {
    "keywordsMatch": 85,
    "keywordsBefore": 42,
    "skillsAlignment": 90,
    "skillsBefore": 55,
    "experienceRelevance": 85,
    "experienceBefore": 38
  }
}`;

    const [rawOriginal, rawTailored] = await Promise.all([
      callAI(originalPrompt),
      callAI(tailorPrompt),
    ]);

    let original, tailored;

    try {
      original = JSON.parse(rawOriginal.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("Failed to parse the original CV structure. Please try again.");
    }

    try {
      tailored = JSON.parse(rawTailored.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("Failed to parse the tailored CV. Please try again.");
    }

    // Increment tailor count for logged in users
    if (user) {
      await incrementTailorCount(user.id);
    }

    tailored.originalCV = original;

    return NextResponse.json(tailored);
  } catch (err: any) {
    console.error("Tailor API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to tailor CV. Please try again." },
      { status: 500 }
    );
  }
}