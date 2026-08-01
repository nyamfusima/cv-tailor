import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function planExpiresAt(planType: string) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (planType === "pro_yearly" ? 12 : 1));
  return expiresAt.toISOString();
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

  if (!verifySignature(rawBody, signature, secret)) {
    console.error("Invalid LemonSqueezy webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event?.meta?.event_name;

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

  const validPlans = ["pro_monthly", "pro_yearly"];
  if (!validPlans.includes(planType)) {
    console.error("Unknown plan type:", planType);
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { error: updateError } = await supabase
    .from("users")
    .update({
      plan: "pro",
      plan_type: planType,
      plan_expires_at: planExpiresAt(planType),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("Failed to upgrade user plan:", updateError);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  console.log(`✅ Upgraded user ${userId} to pro (plan: ${planType})`);
  return NextResponse.json({ success: true });
}
