import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

export interface InterviewQuestion {
  id: number;
  question: string;
  type: "intro" | "behavioural" | "technical" | "situational" | "motivation";
  good_answer_hints: string;
}

const client = new OpenAI({ maxRetries: 4 });

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,ngqongwaayandisa@gmail.com,zengetwasisipho@gmail.com")
  .split(",").map(e => e.trim());

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
  if (!isAdmin) {
    const userData = await getUserCredits(user.id);
    if (!userData || !hasJobCredits(userData)) {
      return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
    }
  }

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
- "type": one of "intro" | "behavioural" | "technical" | "situational" | "motivation"
- "good_answer_hints": string (2-3 bullet points on what a strong answer includes, for internal use only)

Generate exactly 10 questions in this order — start easy and build to technical:
1. A warm opening: "Tell me about yourself" or "Walk me through your background" (type: "intro")
2-3. General behavioural questions about teamwork, communication, or handling challenges (type: "behavioural")
4-5. Situational questions based on realistic scenarios in this role (type: "situational")
6-8. Technical questions derived directly from the skills and requirements in the job description (type: "technical")
9-10. Motivation and culture-fit questions — include one forward-looking question like "Where do you see yourself in 3 years?" (type: "motivation")${jobTitle ? `\n\nThe role is: ${jobTitle}` : ""}

CV:
${cvText.slice(0, 4000)}

Job Description:
${jdText.slice(0, 3000)}`;

  const callOpenAI = async (model: string) => client.chat.completions.create({
    model,
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    let msg;
    try {
      msg = await callOpenAI("gpt-5.1");
    } catch (primary) {
      const isOverload = primary instanceof OpenAI.APIError &&
        (primary.status === 429 || (primary.status ?? 0) >= 500);
      if (!isOverload) throw primary;
      console.warn("[generate-plan] gpt-5.1 overloaded, falling back to gpt-5-mini");
      msg = await callOpenAI("gpt-5-mini");
    }

    const raw = (msg.choices[0]?.message?.content ?? "").trim();
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
