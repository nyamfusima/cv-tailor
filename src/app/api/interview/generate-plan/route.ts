import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface InterviewQuestion {
  id: number;
  question: string;
  type: "behavioural" | "technical" | "situational" | "motivation";
  good_answer_hints: string;
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cvText, jdText, jobTitle } = body as {
    cvText: string;
    jdText: string;
    jobTitle?: string;
  };

  if (!cvText || !jdText) {
    return NextResponse.json({ error: "cvText and jdText are required." }, { status: 400 });
  }

  const prompt = `You are an expert interview coach. Given a candidate's CV and a job description, generate a structured interview plan.

Return ONLY a valid JSON array with no markdown, no backticks, no explanation. Each item must have:
- "id": number
- "question": string (the full interview question)
- "type": one of "behavioural" | "technical" | "situational" | "motivation"
- "good_answer_hints": string (2-3 bullet points on what a strong answer includes, for internal use only)

Generate exactly 6 questions: 2 behavioural, 2 technical (based on the JD requirements), 1 situational, 1 motivation/culture fit.${jobTitle ? `\n\nThe role is: ${jobTitle}` : ""}

CV:
${cvText.slice(0, 4000)}

Job Description:
${jdText.slice(0, 3000)}`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const questions = JSON.parse(cleaned) as InterviewQuestion[];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Unexpected response format from AI.");
    }

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate interview plan.";
    console.error("[generate-plan]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
