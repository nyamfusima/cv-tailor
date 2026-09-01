import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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

  const supabaseAdmin = adminClient();
  const expiresAt = planExpiresAt(planType);

  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      plan: "pro",
      plan_type: planType,
      plan_expires_at: expiresAt,
    })
    .eq("id", userId)
    .select("email")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to upgrade user plan:", updateError);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  if (!updatedUser) {
    console.error("Webhook user not found:", userId);
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const attrs = event?.data?.attributes ?? {};
  const orderItem = attrs.first_order_item ?? {};
  const purchaseEmail = updatedUser.email || attrs.user_email;
  const purchaseId = String(event?.data?.id || attrs.identifier || `lemonsqueezy-${userId}`);
  const purchasedAt = attrs.created_at || new Date().toISOString();
  const totalCents = typeof attrs.total_usd === "number" ? attrs.total_usd : Number(attrs.total || 0);

  const { error: confirmedPurchaseError } = await supabaseAdmin
    .from("confirmed_purchases")
    .upsert({
      purchase_id: purchaseId,
      plan_type: planType,
      item_name: orderItem.product_name || planType,
      buyer_name: attrs.user_name || null,
      purchase_email: purchaseEmail,
      buyer_email: attrs.user_email || null,
      user_email: purchaseEmail,
      purchased_at: purchasedAt,
      subscription_end_date: expiresAt,
      sale_price: Number.isFinite(totalCents) ? totalCents / 100 : 0,
      refunded: false,
      fully_refunded: false,
      disputed: false,
      access_revoked: false,
    }, { onConflict: "purchase_id" });

  if (confirmedPurchaseError) {
    console.error("Failed to record confirmed purchase", confirmedPurchaseError);
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
  }

  console.log(`✅ Upgraded user ${userId} to pro (plan: ${planType})`);
  return NextResponse.json({ success: true });
}
