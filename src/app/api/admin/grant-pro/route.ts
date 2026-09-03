import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/adminEmails";
import { grantProPlan } from "@/lib/user";
import { normalizeEmail, type PaidPlanType } from "@/lib/purchases";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nyamfusima@gmail.com";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || (user.email !== ADMIN_EMAIL && !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const planType: PaidPlanType = body?.plan_type === "pro_yearly" ? "pro_yearly" : "pro_monthly";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: account } = await admin
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "No account found for that email" }, { status: 404 });
  }

  const granted = await grantProPlan({
    userId: account.id,
    email: account.email || email,
    planType,
    purchaseId: `manual-${account.id}-${Date.now()}`,
    itemName: "Manual Pro grant",
    buyerEmail: email,
  });

  if (!granted.ok) {
    return NextResponse.json({ error: granted.error || "Failed to grant Pro" }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: account.email, plan_type: planType });
}
