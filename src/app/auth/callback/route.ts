import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminEmails";
import { ensureAdminProPlan } from "@/lib/user";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/signin?error=auth_failed`);
    }
  }

  if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any });
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email && isAdminEmail(user.email)) {
    await ensureAdminProPlan({ id: user.id, email: user.email });
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
