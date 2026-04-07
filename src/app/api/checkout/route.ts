import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PLANS = {
  starter: {
    url: process.env.GUMROAD_STARTER_URL!,
    tailorCredits: 5,
    pdfCredits: 5,
  },
  growth: {
    url: process.env.GUMROAD_GROWTH_URL!,
    tailorCredits: 20,
    pdfCredits: 20,
  },
  unlimited: {
    url: process.env.GUMROAD_UNLIMITED_URL!,
    tailorCredits: 999999,
    pdfCredits: 999999,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "starter";

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/upload", req.url));
    }

    const plan = PLANS[type as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }

    // Append user email to Gumroad URL so we can identify them in webhook
    const checkoutUrl = new URL(plan.url);
    checkoutUrl.searchParams.set("email", user.email!);
    checkoutUrl.searchParams.set("wanted", "true");

    // Store pending purchase in Supabase so webhook can find the user
    const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin.from("pending_purchases").upsert({
      email: user.email,
      user_id: user.id,
      plan_type: type,
      created_at: new Date().toISOString(),
    });

    return NextResponse.redirect(checkoutUrl.toString());
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", req.url));
  }
}
