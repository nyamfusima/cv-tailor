import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function timingSafeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyGumroadWebhook(req: NextRequest, params: URLSearchParams): boolean {
  const secret = process.env.GUMROAD_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GUMROAD_WEBHOOK_SECRET is not configured");
    return false;
  }

  const provided =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-gumroad-secret") ||
    "";
  if (!timingSafeEqualString(provided, secret)) return false;

  const sellerId = process.env.GUMROAD_SELLER_ID;
  if (sellerId) {
    const incoming = params.get("seller_id") || "";
    if (!timingSafeEqualString(incoming, sellerId)) return false;
  }

  return true;
}

const VALID_PLANS = new Set(["pro_monthly", "pro_yearly"]);

const PRODUCT_MAP: Record<string, string> = {
  pro_monthly: "pro_monthly",
  pro_yearly: "pro_yearly",
};

function planExpiresAt(planType: string) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (planType === "pro_yearly" ? 12 : 1));
  return expiresAt.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    if (!verifyGumroadWebhook(req, params)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const email = params.get("email");
    const productPermalink = params.get("short_product_id") || params.get("product_permalink") || "";
    const refunded = params.get("refunded") === "true";
    const purchaseId = params.get("sale_id") || params.get("purchase_id");

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
      if (purchaseId) {
        await supabaseAdmin
          .from("confirmed_purchases")
          .update({ refunded: true, fully_refunded: true })
          .eq("purchase_id", purchaseId);
      }
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
      .update({
        plan: "pro",
        plan_type: planType,
        plan_expires_at: planExpiresAt(planType),
      })
      .eq("email", email);

    if (updateError) {
      console.error("Failed to upgrade user plan:", updateError);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }

    const purchasedAt = new Date(
      params.get("sale_timestamp") || params.get("created_at") || Date.now()
    );
    const confirmedPurchaseId = purchaseId || `gumroad-${email}-${purchasedAt.getTime()}`;
    const { error: confirmedPurchaseError } = await supabaseAdmin
      .from("confirmed_purchases")
      .upsert({
        purchase_id: confirmedPurchaseId,
        plan_type: planType,
        item_name: params.get("product_name") || params.get("product_permalink") || null,
        buyer_name: params.get("full_name") || params.get("buyer_name") || null,
        purchase_email: email,
        buyer_email: params.get("buyer_email") || null,
        user_email: email,
        purchased_at: purchasedAt.toISOString(),
        subscription_end_date: null,
        sale_price: Number(params.get("price") || params.get("sale_price") || 0),
        refunded: false,
        fully_refunded: false,
        disputed: false,
        access_revoked: false,
      }, { onConflict: "purchase_id" });

    if (confirmedPurchaseError) {
      // Do not reject a genuine payment if the optional audit table has not yet
      // been migrated. The user plan has already been updated above.
      console.error("Failed to record confirmed purchase", confirmedPurchaseError);
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
