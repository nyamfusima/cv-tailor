import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const client = new Anthropic();

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
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
Experience: ${cv.experience.map((j: any) => `${j.title} at ${j.company} (${j.dates}): ${j.bullets.join(", ")}`).join(" | ")}
Skills: ${cv.skills.map((g: any) => `${g.category}: ${g.skills.join(", ")}`).join(" | ")}
Education: ${cv.education.map((e: any) => `${e.degree} at ${e.institution}`).join(", ")}
</cv>

Here is the job description:
<job_description>
${jobDescription}
</job_description>

Return ONLY a JSON object in this exact format, no extra text, no markdown fences:
{
  "subject": "Application for [Job Title] — [Candidate Name]",
  "greeting": "Dear Hiring Manager,",
  "paragraphs": [
    "Opening paragraph...",
    "Achievements paragraph...",
    "Company fit paragraph...",
    "Closing paragraph..."
  ],
  "sign_off": "Kind regards,",
  "name": "${cv.name}"
}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const letter = JSON.parse(cleaned);

    return NextResponse.json(letter);
  } catch (err: any) {
    console.error("Cover letter error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate cover letter." },
      { status: 500 }
    );
  }
}