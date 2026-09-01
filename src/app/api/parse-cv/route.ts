import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

const client = new OpenAI();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,ngqongwaayandisa@gmail.com,zengetwasisipho@gmail.com")
  .split(",").map(e => e.trim());

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) {
      const userData = await getUserCredits(user.id);
      if (!userData || !hasJobCredits(userData)) {
        return NextResponse.json({ error: "NO_CREDITS" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const cvFile = formData.get("cv") as File;

    if (!cvFile) {
      return NextResponse.json({ error: "No CV file provided." }, { status: 400 });
    }

    const cvText = await parseFile(cvFile);

    const completion = await client.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Extract and structure the following CV into JSON. Do not rewrite anything — preserve content exactly.

<cv>
${cvText}
</cv>

Return ONLY a JSON object, no markdown:
{
  "name": "Full name",
  "email": "email",
  "phone": "phone",
  "location": "location",
  "linkedin": "linkedin url or empty string",
  "summary": "professional summary",
  "experience": [
    { "title": "Job title", "company": "Company", "dates": "Start – End", "bullets": ["bullet 1"] }
  ],
  "education": [
    { "degree": "Degree", "institution": "Institution", "dates": "Year", "coursework": ["course 1", "course 2"] }
  ],
  "certifications": [
    { "name": "Cert name", "issuer": "Issuer", "date": "Year" }
  ],
  "skills": [
    { "category": "Category name", "skills": ["every", "skill", "in", "that", "category"] }
  ]
}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstObject = cleaned.match(/\{[\s\S]*\}/);
      if (!firstObject) {
        throw new Error("CV parsing returned an unexpected response. Please try again.");
      }
      parsed = JSON.parse(firstObject[0]);
    }

    return NextResponse.json({ cv: parsed });
  } catch (err: any) {
    console.error("parse-cv error:", err);
    return NextResponse.json({ error: err.message || "Failed to parse CV." }, { status: 500 });
  }
}
