import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits, hasJobCredits } from "@/lib/user";
import { isAdminEmail } from "@/lib/adminEmails";

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = isAdminEmail(user.email);
  if (!isAdmin) {
    const userData = await getUserCredits(user.id);
    if (!userData || !hasJobCredits(userData)) {
      return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
    }
  }

  const { jobTitle, transcriptJson, debriefText } = await req.json() as {
    jobTitle: string;
    transcriptJson: unknown;
    debriefText: string;
  };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await adminClient
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      job_title: jobTitle,
      transcript_json: transcriptJson,
      debrief_text: debriefText,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[save-session]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
