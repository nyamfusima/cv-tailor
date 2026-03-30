import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nyamfusima@gmail.com";

export async function GET(_req: NextRequest) {
  try {
    // Validate the requester using the session cookies (anon key)
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    // Use the service role on the server only (never expose to the client)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("tailor_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch sessions", error);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    const totalSessions = data.length;
    const uniqueUsers = new Set(data.map((s) => s.user_email)).size;
    const avgScore =
      data.length > 0
        ? Math.round(
            data.reduce((sum, s) => sum + (s.match_score || 0), 0) /
              data.length
          )
        : 0;
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = data.filter((s) =>
      (s as any).created_at?.startsWith(today)
    ).length;

    return NextResponse.json({
      sessions: data,
      stats: {
        totalSessions,
        totalUsers: uniqueUsers,
        avgScore,
        todaySessions,
      },
    });
  } catch (err) {
    console.error("Admin sessions API error", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
