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
      "the.real.chad.naude@gmail.com",
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

    const tailorPrompt = `You are an expert CV rewriter and ATS specialist. Rewrite the candidate's CV to match the job description using the exact keywords and language from the job description.

<cv>
${cvText}
</cv>

<job_description>
${jobDescription}
</job_description>

RULES — every single one is mandatory:

DATES (critical — no exceptions):
- Copy every date, year, and date range EXACTLY as written in the original CV — do not change a single character
- If a date is missing in the original CV, leave that field as an empty string — never invent or guess a date
- Never add start years, end years, or durations that are not explicitly in the original CV
- Preserve the exact order of all experience and education entries — do not reorder them

BULLET POINTS:
- Each bullet must start directly with a strong action verb — no dash, no hyphen, no bullet character, no leading symbol of any kind
- Maximum 20 words per bullet — cut ruthlessly, every word must carry weight
- No filler phrases: do not use "responsible for", "tasked with", "helped to", "assisted in", "worked on", "demonstrated ability to", "proven track record of", "instrumental in", "played a key role in", "contributed to"
- Start with impact: lead with what was achieved or delivered, not what the person did day-to-day
- Each bullet must contain at least one keyword or phrase from the job description where it naturally fits

SUMMARY:
- Maximum 3 sentences
- No clichés or vague claims — every sentence must be specific and tied to the job description
- Do not start with "I" or the candidate's name

CONTENT INTEGRITY:
- Never invent qualifications, companies, degrees, metrics, or responsibilities
- Only reword what exists — do not add new experiences or achievements
- Preserve exact company names, job titles, and institution names
- Certifications: copy from original CV only, do not add any

SKILLS:
- Reorder so the most job-relevant skills appear first
- Do not add skills that are not in the original CV

OUTPUT:
- Return ONLY the JSON object below — no preamble, no explanation, no markdown, no fences
- All string values must be plain text — no asterisks, no hyphens, no markdown of any kind inside values

{
  "name": "Full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "linkedin": "linkedin url or empty string",
  "summary": "tailored professional summary, max 3 sentences, no clichés",
  "experience": [
    {
      "title": "Job title exactly as in original CV",
      "company": "Company name exactly as in original CV",
      "dates": "copied exactly from original CV — do not change",
      "bullets": ["Action verb + achievement + keyword, max 20 words", "Action verb + achievement + keyword, max 20 words"]
    }
  ],
  "education": [
    {
      "degree": "Degree name exactly as in original CV",
      "institution": "Institution name exactly as in original CV",
      "dates": "copied exactly from original CV — do not change",
      "coursework": ["Relevant Course 1", "Relevant Course 2"]
    }
  ],
  "certifications": [
    {
      "name": "Certification name from original CV only",
      "issuer": "Issuing body",
      "date": "copied exactly from original CV"
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
