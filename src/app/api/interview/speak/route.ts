import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,ngqongwaayandisa@gmail.com,zengetwasisipho@gmail.com")
  .split(",").map(e => e.trim());

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
  if (!isAdmin) {
    const userData = await getUserCredits(user.id);
    if (!userData || !hasJobCredits(userData)) {
      return new Response(JSON.stringify({ error: "PRO_REQUIRED" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const { text } = await req.json() as { text: string };
  if (!text?.trim()) return new Response("No text provided", { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID!;
  const apiKey = process.env.ELEVENLABS_API_KEY!;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    console.error("[speak] ElevenLabs error:", res.status, err.slice(0, 200));
    return new Response("TTS failed", { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-store",
    },
  });
}
