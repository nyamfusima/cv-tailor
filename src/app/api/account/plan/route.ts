import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { toAccountPlanResponse } from "@/lib/purchases";
import { getUserCredits } from "@/lib/user";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(user.id);
  if (!credits) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...toAccountPlanResponse(credits),
    user_id: credits.id,
    email: credits.email,
  });
}
