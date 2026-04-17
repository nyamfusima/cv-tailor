import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_CREDITS = {
  pro_monthly: { tailorCredits: 999999, pdfCredits: 999999 },
  pro_yearly: { tailorCredits: 999999, pdfCredits: 999999 },
};

// Map Gumroad product URLs to plan types
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

    // Handle refunds — remove credits
    if (refunded) {
      const planType = PRODUCT_MAP[productPermalink];
      if (planType) {
        const plan = PLAN_CREDITS[planType as keyof typeof PLAN_CREDITS];
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("tailor_credits, pdf_credits")
          .eq("email", email)
          .single();

        if (userData) {
          await supabaseAdmin
            .from("users")
            .update({
              tailor_credits: Math.max(0, userData.tailor_credits - plan.tailorCredits),
              pdf_credits: Math.max(0, userData.pdf_credits - plan.pdfCredits),
            })
            .eq("email", email);
        }
      }
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

    if (!planType) {
      console.error("Could not determine plan type for:", email, productPermalink);
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const plan = PLAN_CREDITS[planType as keyof typeof PLAN_CREDITS];

    // Find user by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, tailor_credits, pdf_credits")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      console.error("User not found for email:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add credits
    const newTailorCredits = planType.startsWith("pro_")
      ? 999999
      : userData.tailor_credits + plan.tailorCredits;

    const newPdfCredits = planType.startsWith("pro_")
      ? 999999
      : userData.pdf_credits + plan.pdfCredits;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        tailor_credits: newTailorCredits,
        pdf_credits: newPdfCredits,
      })
      .eq("email", email);

    if (updateError) {
      console.error("Failed to update credits:", updateError);
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
    }

    // Clean up pending purchase
    await supabaseAdmin
      .from("pending_purchases")
      .delete()
      .eq("email", email);

    console.log(`Credits added for ${email}: ${newTailorCredits} tailors, ${newPdfCredits} PDFs`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
