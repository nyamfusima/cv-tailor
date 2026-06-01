import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface HistoryEntry { question: string; answer: string; }
interface InterviewQuestion { id: number; question: string; type: string; }

interface RespondBody {
  cvText: string;
  jdText: string;
  jobTitle: string;
  questionPlan: InterviewQuestion[];
  history: HistoryEntry[];
  currentQuestionIndex: number;
  userAnswer: string;
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    cvText, jdText, jobTitle, questionPlan,
    history, currentQuestionIndex, userAnswer,
  } = await req.json() as RespondBody;

  const nextIndex = currentQuestionIndex + 1;
  const hasMore = nextIndex < questionPlan.length;
  const nextPlannedQ = hasMore ? questionPlan[nextIndex].question : null;

  const transcript = history
    .slice(0, -1) // all previous Q&As (current was just added)
    .map((h, i) => `Q${i + 1}: ${h.question}\nCandidate: ${h.answer}`)
    .join("\n\n");

  const system = `You are conducting a professional job interview for the role of ${jobTitle || "this position"}. You are warm but professional. Keep every response under 3 sentences. Never give feedback or coaching during the interview — just acknowledge briefly and move on naturally, exactly like a real interviewer would.`;

  const context = [
    `Candidate CV (excerpt): ${cvText.slice(0, 800)}`,
    `Job description (excerpt): ${jdText.slice(0, 800)}`,
  ].join("\n");

  const userMsg = `${context}

${transcript ? `Interview so far:\n${transcript}\n\n` : ""}The candidate was just asked: "${history[history.length - 1]?.question ?? ""}"
Their answer: "${userAnswer}"

${hasMore
  ? `The next planned question is: "${nextPlannedQ}"

Instructions:
- If the answer was very short or vague (under 15 words), ask ONE concise follow-up to draw out more detail. Return JSON: {"type":"followup","text":"<your follow-up question>"}
- Otherwise, acknowledge in one natural sentence and ask the next planned question. Return JSON: {"type":"next_question","text":"<acknowledgment + next question>"}`
  : `This was the final question.
Close the interview warmly in 2 sentences. Return JSON: {"type":"end","text":"<warm closing>"}`}

Return ONLY the JSON object. No markdown, no explanation.`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const result = JSON.parse(cleaned) as { type: string; text: string };
    return NextResponse.json(result);
  } catch {
    // Graceful fallback so the interview never stalls
    if (hasMore) {
      return NextResponse.json({
        type: "next_question",
        text: `Thank you for that. ${nextPlannedQ}`,
      });
    }
    return NextResponse.json({
      type: "end",
      text: "Thank you so much for your time today. That wraps up our interview — we'll be in touch shortly.",
    });
  }
}
