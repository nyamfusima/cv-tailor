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
          content: `You are an expert CV writer and ATS specialist. Your job is to tailor the candidate's CV to match a specific job description as closely as possible, optimising for ATS systems.

Here is the candidate's current CV:
<cv>
${cvText}
</cv>

Here is the job description they are applying for:
<job_description>
${jobDescription}
</job_description>

Rewrite the CV to:
1. Mirror the exact keywords and phrases from the job description
2. Reorder and rewrite bullet points to highlight the most relevant experience first
3. Adjust the professional summary/objective to speak directly to this role
4. Keep all facts truthful — do not invent experience or qualifications
5. Keep the same overall structure and sections as the original CV
6. For education, include relevant coursework that matches the job description if known — do not invent courses

Return ONLY a JSON object in this exact format, no extra text, no markdown fences:
{
  "name": "Full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "linkedin": "linkedin url or empty string",
  "summary": "tailored professional summary",
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
      "degree": "Degree or qualification name",
      "institution": "Institution name",
      "dates": "Year or Start – Present if still studying",
      "coursework": ["Relevant Course 1", "Relevant Course 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "matchScore": 85
}

The matchScore is a number from 0–100 representing how well the tailored CV matches the job description.`,
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