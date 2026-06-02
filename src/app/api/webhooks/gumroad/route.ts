import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_PLANS = new Set(["pro_monthly", "pro_yearly"]);

const PRODUCT_MAP: Record<string, string> = {
  pro_monthly: "pro_monthly",
  pro_yearly: "pro_yearly",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const email = params.get("email");
    const productPermalink = params.get("short_product_id") || params.get("product_permalink") || "";
    const refunded = params.get("refunded") === "true";

    console.log("Gumroad webhook received:", { email, productPermalink, refunded });

    if (!email) {
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    // Handle refunds — downgrade back to free
    if (refunded) {
      await supabaseAdmin
        .from("users")
        .update({ plan: "free" })
        .eq("email", email);
      console.log(`Downgraded ${email} to free (refund)`);
      return NextResponse.json({ success: true });
    }

    // Find plan type from product permalink
    let planType = PRODUCT_MAP[productPermalink];

    // Fallback — check pending_purchases table
    if (!planType) {
      const { data: pending } = await supabaseAdmin
        .from("pending_purchases")
        .select("plan_type")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (pending) planType = pending.plan_type;
    }

    if (!planType || !VALID_PLANS.has(planType)) {
      console.error("Could not determine plan type for:", email, productPermalink);
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ plan: "pro" })
      .eq("email", email);

    if (updateError) {
      console.error("Failed to upgrade user plan:", updateError);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }

    // Clean up pending purchase
    await supabaseAdmin
      .from("pending_purchases")
      .delete()
      .eq("email", email);

    console.log(`✅ Upgraded ${email} to pro (plan: ${planType})`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
