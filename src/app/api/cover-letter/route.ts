import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { asRecord, asString, asStringArray, parseModelJson } from "@/lib/cv/json";
import { COVER_LETTER_JSON_SCHEMA } from "@/lib/cv/schema";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const client = new OpenAI();

function toCoverLetter(parsed: unknown, fallbackName: string) {
  const rec = asRecord(parsed) ?? {};
  return {
    subject: asString(rec.subject),
    greeting: asString(rec.greeting) || "Dear Hiring Manager,",
    paragraphs: asStringArray(rec.paragraphs),
    sign_off: asString(rec.sign_off) || asString(rec.signOff) || "Kind regards,",
    name: asString(rec.name) || fallbackName,
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { cv, jobDescription } = await req.json();

    if (!cv || !jobDescription) {
      return NextResponse.json(
        { error: "Missing CV or job description." },
        { status: 400 }
      );
    }

    const messages = [
        {
          role: "user" as const,
          content: `You are an expert cover letter writer. Write a compelling, professional cover letter based on the tailored CV and job description below.

The cover letter must:
1. Open with a strong, specific hook — not "I am writing to apply for..."
2. In the first paragraph, immediately connect the candidate's strongest relevant experience to the role's core need
3. In the second paragraph, highlight 2-3 specific achievements from the CV that directly map to the job requirements — use numbers and impact where possible
4. In the third paragraph, show genuine understanding of what the company/role is trying to achieve and why the candidate is the right fit
5. Close with a confident, action-oriented paragraph — not generic
6. Keep it to 4 paragraphs max — tight, punchy, no fluff
7. Match the tone of the job description — if it's a startup, be energetic; if corporate, be polished
8. Never use clichés like "I am a team player", "passionate", "hard worker"

Here is the tailored CV:
<cv>
Name: ${cv.name}
Summary: ${cv.summary}
Experience: ${cv.experience.map((j: { title: string; company: string; dates: string; bullets: string[] }) => `${j.title} at ${j.company} (${j.dates}): ${j.bullets.join(", ")}`).join(" | ")}
Skills: ${cv.skills.map((g: { category: string; skills: string[] }) => `${g.category}: ${g.skills.join(", ")}`).join(" | ")}
Education: ${cv.education.map((e: { degree: string; institution: string }) => `${e.degree} at ${e.institution}`).join(", ")}
</cv>

Here is the job description:
<job_description>
${jobDescription}
</job_description>

Return ONLY JSON matching the required schema. Do not include trailing commas.`,
        },
    ];

    const schemaFormat = {
      type: "json_schema" as const,
      json_schema: {
        name: COVER_LETTER_JSON_SCHEMA.name,
        strict: true,
        schema: COVER_LETTER_JSON_SCHEMA.schema,
      },
    };
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 4096,
        response_format: schemaFormat,
        messages,
      });
    } catch {
      completion = await client.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
        messages,
      });
    }

    const raw = completion.choices[0]?.message?.content ?? "";
    const letter = toCoverLetter(parseModelJson(raw, completion.choices[0]?.finish_reason), cv.name);
    if (!letter.paragraphs.length) {
      throw new Error("Cover letter was empty. Please try again.");
    }

    return NextResponse.json(letter);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate cover letter.";
    console.error("Cover letter error:", err);
    return NextResponse.json(
      { error: message === "Failed to parse model JSON." ? "Cover letter response was invalid. Please try again." : message },
      { status: 500 }
    );
  }
}
