import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Credits granted per plan
const PLAN_CREDITS: Record<string, { tailorCredits: number; pdfCredits: number; unlimited: boolean }> = {
  pro_monthly: { tailorCredits: 999999, pdfCredits: 999999, unlimited: true },
  pro_yearly: { tailorCredits: 999999, pdfCredits: 999999, unlimited: true },
};

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

  // Verify webhook authenticity
  if (!verifySignature(rawBody, signature, secret)) {
    console.error("Invalid LemonSqueezy webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event?.meta?.event_name;

  // Only handle successful orders
  if (eventName !== "order_created") {
    return NextResponse.json({ received: true });
  }

  const customData = event?.meta?.custom_data;
  const userId: string | undefined = customData?.user_id;
  const planType: string | undefined = customData?.plan_type;

  if (!userId || !planType) {
    console.error("Webhook missing user_id or plan_type:", customData);
    return NextResponse.json({ error: "Missing custom data" }, { status: 400 });
  }

  const plan = PLAN_CREDITS[planType];
  if (!plan) {
    console.error("Unknown plan type:", planType);
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Fetch current credits
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("tailor_credits, pdf_credits")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    console.error("User not found:", userId, fetchError);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newTailor = plan.unlimited
    ? 999999  // effectively unlimited
    : user.tailor_credits + plan.tailorCredits;

  const newPDF = plan.unlimited
    ? 999999
    : user.pdf_credits + plan.pdfCredits;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      tailor_credits: newTailor,
      pdf_credits: newPDF,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to update credits:", updateError);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  console.log(`✅ Credited user ${userId} with ${plan.tailorCredits} tailors (plan: ${planType})`);
  return NextResponse.json({ success: true });
}
