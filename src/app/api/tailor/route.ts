import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, deductTailorCredit, hasTailorCredits } from "@/lib/user";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic();

function derivePrimaryRole(tailored: any, original: any) {
  // Prefer the tailored first experience title, then original, then summary snippet
  const title =
    tailored?.experience?.[0]?.title ||
    original?.experience?.[0]?.title ||
    "";
  if (title) return title;
  const summary = (tailored?.summary || original?.summary || "").trim();
  return summary ? summary.split(/[.|\n]/)[0].slice(0, 80) : "Unknown";
}

async function callAI(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

/** Strip markdown fences and extract the first complete JSON object from a string. */
function extractJSON(raw: string): string {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  // Walk forward looking for the matching closing brace
  const start = cleaned.indexOf("{");
  if (start === -1) return cleaned;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return cleaned.slice(start, i + 1); }
  }
  // Truncated — return what we have and let JSON.parse throw a clear error
  return cleaned;
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

    // Check credits (skip for admin accounts)
    const ADMIN_EMAILS = [
      "nyamfusima@gmail.com",
      "hamza26mohamud@gmail.com",
      "ngqongwaayandisa@gmail.com",
      "zengetwasisipho@gmail.com",
    ];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");

    if (!isAdmin) {
      const userData = await getUserCredits(user.id);
      if (!userData || !hasTailorCredits(userData)) {
        return NextResponse.json(
          { error: "NO_CREDITS", message: "You have no tailor credits left. Buy more to continue." },
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
      original = JSON.parse(extractJSON(rawOriginal));
    } catch {
      throw new Error("Failed to parse the original CV structure. Please try again.");
    }

    try {
      tailored = JSON.parse(extractJSON(rawTailored));
    } catch {
      throw new Error("Failed to parse the tailored CV. Please try again.");
    }

    // Deduct credit after successful tailor (skip for admins)
    if (!isAdmin) {
      await deductTailorCredit(user.id);
    }

    const primaryRole = derivePrimaryRole(tailored, original);
    tailored.originalCV = original;
    tailored.meta = {
      fileName: cvFile.name || "upload",
      primaryRole,
      jobDescriptionPreview: jobDescription.slice(0, 200),
    };


    // Save session to Supabase (fail loudly so we can debug)
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error: insertError } = await supabaseAdmin.from("tailor_sessions").insert({
        user_id: user.id,
        user_email: user.email,
        cv_text: cvText,
        job_description: jobDescription,
        tailored_cv: tailored,
        match_score: tailored.matchScore || null,
      });

      if (insertError) {
        console.error("Failed to save session:", insertError);
        return NextResponse.json(
          { error: "DB_INSERT_FAILED", message: insertError.message },
          { status: 500 }
        );
      }
    } catch (err: any) {
      console.error("Failed to save session (unexpected):", err);
      return NextResponse.json(
        { error: "DB_INSERT_FAILED", message: err.message || "Supabase insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(tailored);
  } catch (err: any) {
    console.error("Tailor API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to tailor CV. Please try again." },
      { status: 500 }
    );
  }
}
