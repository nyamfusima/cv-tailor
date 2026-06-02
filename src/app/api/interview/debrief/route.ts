import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

interface HistoryEntry { question: string; answer: string; }

const client = new Anthropic({ maxRetries: 4 });

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

  const { jobTitle, history } = await req.json() as {
    jobTitle: string;
    history: HistoryEntry[];
  };

  const transcript = history
    .map((h, i) => `Q${i + 1}: ${h.question}\nCandidate: ${h.answer}`)
    .join("\n\n");

  const prompt = `You interviewed a candidate for the role of ${jobTitle || "this position"}. Here is the full interview transcript:

${transcript}

Write a concise interview debrief. Use plain text only — no markdown, no bullet symbols, no asterisks.

Structure your response in these clearly labelled sections:
Overall Impression, Strongest Moment, Areas to Improve, Top 3 Tips for Next Time.

Be honest but encouraging. Write as if you are a coach speaking directly to the candidate.`;

  const callClaude = async (model: string) => client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    let msg;
    try {
      msg = await callClaude("claude-sonnet-4-6");
    } catch (primary) {
      const isOverload = primary instanceof Anthropic.APIError && primary.status === 529;
      if (!isOverload) throw primary;
      console.warn("[debrief] Sonnet overloaded, falling back to Haiku");
      msg = await callClaude("claude-haiku-4-5-20251001");
    }

    const debrief = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    return NextResponse.json({ debrief });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate debrief.";
    console.error("[debrief]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
