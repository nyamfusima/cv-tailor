import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, deductTailorCredit, hasTailorCredits } from "@/lib/user";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI();

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

async function callAI(prompt: string, system?: string, retries = 3): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = system
    ? [{ role: "system", content: system }, { role: "user", content: prompt }]
    : [{ role: "user", content: prompt }];
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 16384,
        messages,
      });
      return completion.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      const isOverloaded = err?.status === 429 || err?.status === 500 || err?.status === 503;
      if (isOverloaded && attempt < retries) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("AI service unavailable after retries. Please try again in a moment.");
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

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,the.real.chad.naude@gmail.com,ngqongwaayandisa@gmail.com,somilamangqu@gmail.com,moabithapelo1@gmail.com,sikhanyiselesky@gmail.com,zengetwasisipho@gmail.com")
      .split(",").map(e => e.trim());
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
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"],
      "url": "url or empty string",
      "dates": "date range or empty string"
    }
  ],
  "skills": [
    {
      "category": "Category name",
      "skills": ["skill1", "skill2"]
    }
  ]
}`;

    const tailorSystem = `You are an expert technical CV rewriter and ATS specialist. You optimize CVs to match job descriptions without ever distorting the candidate's real history.

RULES — every single one is mandatory:

FACTUAL INTEGRITY (most important):
- The tailored CV must remain at least 90% factually identical to the original CV. The objective is optimization, not rewriting the candidate's career history.
- NEVER invent responsibilities, tools, projects, achievements, certifications, or metrics that are not explicitly present in the original CV
- NEVER replace technical accomplishments with generic business language
- NEVER downgrade advanced engineering work into generic assistant tasks
- Do not remove founder experience, AI engineering work, hackathon achievements, production projects, APIs, RAG systems, or technical implementation details merely to increase keyword matching — these are what make the candidate stand out
- Preserve all major projects, technologies, and achievements unless they are completely irrelevant to the job
- Preserve exact company names, job titles, and institution names

CRITICAL ANTI-HALLUCINATION RULES:
- The job description is ONLY used for keyword alignment. It is NOT evidence that the candidate has done something.
- Never rewrite experience as if the candidate performed responsibilities that appear only in the job description
- Forbidden transformations — never do anything like these:
  "Built APIs" must never become "Managed founder inboxes"
  "Created AI agents" must never become "Protected executive time"
  "Built automation pipelines" must never become "Managed project operations"
  "Developed chatbot systems" must never become "Performed executive assistant duties"
- The candidate's actual engineering work must remain visible. Prefer "Built AI chatbots that automated customer interactions" over "Protected founder time through AI assistants"

BANNED VOCABULARY — never use these phrases unless they already appear word-for-word in the original CV:
- "founder productivity", "executive support", "inbox management", "calendar management", "organised digital filing", "stakeholder communications", "protected client time"
- Synthetic "-style" wording of any kind: "production-style", "workflow-style", "lead-style", "email-style"
- Avoid synthetic business jargon everywhere — use plain technical language

TECHNICAL SPECIFICITY:
- Keep APIs, databases, AI models, frameworks, and production systems named exactly as written in the original CV
- Preserve project details and measurable achievements

KEYWORD ALIGNMENT — achieve it ONLY by:
- Reordering existing content so the most job-relevant items appear first
- Rephrasing existing experience using the job description's exact vocabulary
- Highlighting transferable skills
- If the job description mentions a technology not in the CV, mention it ONLY where it is reasonably adjacent to existing experience, using hedged wording such as "familiar with", "exposure to", or "similar platforms" — and record every such mention in the "assumptions" output field

SKILLS:
- Add a skill only if (a) it appears explicitly in the original CV, or (b) it can be directly inferred from existing projects with high confidence — record every inferred skill in the "assumptions" output field
- Reorder so the most job-relevant skills appear first

DATES (critical — no exceptions):
- Copy every date, year, and date range EXACTLY as written in the original CV — do not change a single character
- If a date is missing in the original CV, leave that field as an empty string — never invent or guess a date
- Never add start years, end years, or durations that are not explicitly in the original CV
- Preserve the exact order of all experience and education entries — do not reorder them

EDUCATION:
- Preserve ALL coursework exactly as written — never remove coursework entries, never shorten coursework lists
- Only reorder coursework by relevance to the job description

PROJECTS:
- Preserve all technologies exactly — never remove AI models, APIs, databases, frameworks, rankings, metrics, or deployment details
- Never simplify projects into generic business language
- Bad: "Generated reports and insights". Good: "Built an AI-powered application using OpenAI GPT and job market APIs to generate tailored CVs and interview simulations"

BULLET POINTS:
- Each bullet must start directly with a strong action verb — no dash, no hyphen, no bullet character, no leading symbol of any kind
- Maximum 20 words per bullet — cut ruthlessly, every word must carry weight
- No filler phrases: do not use "responsible for", "tasked with", "helped to", "assisted in", "worked on", "demonstrated ability to", "proven track record of", "instrumental in", "played a key role in", "contributed to"
- Start with impact: lead with what was achieved or delivered, not what the person did day-to-day
- Use keywords or phrases from the job description only where they naturally fit — never at the cost of technical accuracy

SUMMARY:
- Maximum 3 sentences
- No clichés or vague claims — every sentence must be specific and tied to the job description
- Do not start with "I" or the candidate's name

CERTIFICATIONS:
- Copy from the original CV only — do not add any

PRESERVATION CHECK — before generating output, internally verify:
1. Every experience entry still exists
2. Every project still exists
3. Every certification still exists
4. Every coursework item still exists
5. Every technology still exists
If any item was removed, restore it unless it directly violates factual accuracy. The tailored CV must preserve at least 95% of the original information while improving ATS alignment.

OUTPUT:
- Return ONLY the JSON object in the exact format the user specifies — no preamble, no explanation, no markdown, no fences
- All string values must be plain text — no asterisks, no hyphens, no markdown of any kind inside values`;

    const buildTailorPrompt = (originalJson: unknown) => `Tailor the candidate's CV below to the job description, following every one of your rules. The CV is provided as structured JSON extracted verbatim from the original — every entry, bullet, technology, coursework item, and detail in it must be accounted for in your output.

<cv_json>
${JSON.stringify(originalJson, null, 2)}
</cv_json>

<job_description>
${jobDescription}
</job_description>

Return ONLY this JSON object:
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
  "projects": [
    {
      "name": "Project name exactly as in original CV",
      "description": "Rewritten description that keeps every technology, metric, and deployment detail, max 2 sentences",
      "technologies": ["tech1", "tech2"],
      "url": "url or empty string",
      "dates": "copied exactly from original CV or empty string"
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
  },
  "addedKeywords": ["every job description keyword newly worked into the CV"],
  "assumptions": ["every inferred skill or adjacent-technology mention, with a short reason it was included — empty array if none"]
}`;

    // Step 1 — extract the original CV verbatim into structured JSON
    const rawOriginal = await callAI(originalPrompt);

    let original;
    try {
      original = JSON.parse(extractJSON(rawOriginal));
    } catch {
      throw new Error("Failed to parse the original CV structure. Please try again.");
    }

    // Step 2 — tailor from the extracted JSON, not raw text, so no detail can be silently dropped
    const rawTailored = await callAI(buildTailorPrompt(original), tailorSystem);

    let tailored;
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
