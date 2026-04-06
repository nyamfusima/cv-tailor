import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, deductJobCredit, hasJobCredits } from "@/lib/user";

const client = new Anthropic();

const ADMIN_EMAILS = [
  "nyamfusima@gmail.com",
  "hamza26mohamud@gmail.com",
  "ngqongwaayandisa@gmail.com",
  "zengetwasisipho@gmail.com",
];

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
      await deductJobCredit(user.id);
    }

    const formData = await req.formData();
    const cvFile = formData.get("cv") as File;

    if (!cvFile) {
      return NextResponse.json({ error: "No CV file provided." }, { status: 400 });
    }

    const cvText = await parseFile(cvFile);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
    { "degree": "Degree", "institution": "Institution", "dates": "Year", "coursework": [] }
  ],
  "certifications": [
    { "name": "Cert name", "issuer": "Issuer", "date": "Year" }
  ],
  "skills": [
    { "category": "Category name", "skills": ["skill1", "skill2"] }
  ]
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return NextResponse.json({ cv: parsed });
  } catch (err: any) {
    console.error("parse-cv error:", err);
    return NextResponse.json({ error: err.message || "Failed to parse CV." }, { status: 500 });
  }
}
