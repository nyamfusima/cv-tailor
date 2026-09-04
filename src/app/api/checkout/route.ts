import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/purchases";

const PLANS = {
  pro_monthly: {
    url: process.env.GUMROAD_PRO_MONTHLY_URL || process.env.GUMROAD_UNLIMITED_URL!,
  },
  pro_yearly: {
    url:
      process.env.GUMROAD_GROWTH_URL ||
      process.env.GUMROAD_PRO_YEARLY_URL ||
      process.env.GUMROAD_UNLIMITED_URL!,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "pro_monthly";

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/upload", req.url));
    }

    const plan = PLANS[type as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    const accountEmail = normalizeEmail(user.email || "");
    const checkoutUrl = new URL(plan.url);
    checkoutUrl.searchParams.set("email", accountEmail);
    checkoutUrl.searchParams.set("user_email", accountEmail);
    checkoutUrl.searchParams.set("wanted", "true");

    const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: pendingError } = await supabaseAdmin.from("pending_purchases").upsert({
      email: accountEmail,
      user_id: user.id,
      plan_type: type,
      created_at: new Date().toISOString(),
    }, { onConflict: "email" });

    if (pendingError) {
      console.error(JSON.stringify({
        msg: "checkout_pending_purchase_failed",
        userId: user.id,
        accountEmail,
        error: pendingError.message,
      }));
    }

    return NextResponse.redirect(checkoutUrl.toString());
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", req.url));
  }
}
