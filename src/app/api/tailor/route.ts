import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, deductTailorCredit, hasTailorCredits } from "@/lib/user";

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
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Must be signed in
    if (!user) {
      return NextResponse.json(
        { error: "SIGN_IN_REQUIRED", message: "Please sign in to tailor your CV." },
        { status: 401 }
      );
    }

    // Check credits
    const userData = await getUserCredits(user.id);
    if (!userData || !hasTailorCredits(userData)) {
      return NextResponse.json(
        { error: "NO_CREDITS", message: "You have no tailor credits left. Buy more to continue." },
        { status: 403 }
      );
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

1. **Rewrite every bullet point** to use the exact language, keywords, and phrases from the job description.
2. **Rewrite the summary completely** — it must read as if this person was born to do this specific job.
3. **Reorder experience bullets** — most relevant to the job description goes first.
4. **Inject keywords aggressively** — every technical skill, tool, methodology, and buzzword from the job description.
5. **Reframe job titles and responsibilities** to match the job description's language.
6. **Skills section** — reorder so most job-relevant appear first.
7. **Never invent qualifications, companies, or degrees.**
8. **matchScore should be 75+ after your rewrite.**
9. **Certifications** — extract from CV only, do not invent.
10. **Education coursework** — list relevant coursework based on job description.
11. **Score breakdown** — honest before/after scores.

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

    // Deduct credit after successful tailor
    await deductTailorCredit(user.id);

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