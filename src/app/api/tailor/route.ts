import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import Groq from "groq-sdk";

const client = new Groq();

export async function POST(req: NextRequest) {
  try {
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

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an aggressive, expert CV rewriter and ATS specialist. Your job is to COMPLETELY TRANSFORM the candidate's CV to match the job description as closely as possible. You are not a passive editor — you are a ruthless rewriter.

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

8. **The matchScore must reflect YOUR rewrite** — after your aggressive rewrite, the score should be 75 or above in almost all cases. If you rewrote well, the score should reflect that. A low score means you did not rewrite aggressively enough.

9. **Certifications** — extract any certificates or credentials from the CV. Do not invent any.

10. **Education coursework** — list relevant coursework based on the job description if the candidate's field of study supports it.

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
  "matchScore": 85
}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const tailored = JSON.parse(cleaned);

    return NextResponse.json(tailored);
  } catch (err: any) {
    console.error("Tailor API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to tailor CV." },
      { status: 500 }
    );
  }
}