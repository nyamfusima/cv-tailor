import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { grantProPlan } from "@/lib/user";
import {
  normalizeEmail,
  resolveGumroadPlanType,
  type PaidPlanType,
} from "@/lib/purchases";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function timingSafeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyGumroadPing(req: NextRequest, params: URLSearchParams): "ok" | "bad" | "fallback" {
  const secret = process.env.GUMROAD_WEBHOOK_SECRET;
  const expectedSeller = process.env.GUMROAD_SELLER_ID;
  const providedSecret =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-gumroad-secret") ||
    "";
  const incomingSeller = params.get("seller_id") || "";

  if (secret && providedSecret) {
    return timingSafeEqualString(providedSecret, secret) ? "ok" : "bad";
  }
  if (expectedSeller) {
    return incomingSeller && timingSafeEqualString(incomingSeller, expectedSeller) ? "ok" : "bad";
  }
  // Secret may be configured in env while the Gumroad ping URL still has no ?secret=.
  // Do not drop real payments; require a checkout we created (pending purchase) instead.
  if (incomingSeller || params.get("sale_id") || params.get("purchase_id")) {
    return "fallback";
  }
  return "bad";
}

async function findPending(email: string) {
  const { data } = await supabaseAdmin
    .from("pending_purchases")
    .select("plan_type, user_id, email, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function findUser(email: string, userId?: string | null) {
  if (userId) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const auth = verifyGumroadPing(req, params);
    if (auth === "bad") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const rawEmail = params.get("email") || params.get("buyer_email") || "";
    const email = rawEmail ? normalizeEmail(rawEmail) : "";
    const productPermalink = params.get("short_product_id") || params.get("product_permalink") || "";
    const refunded = params.get("refunded") === "true";
    const purchaseId = params.get("sale_id") || params.get("purchase_id");

    console.log("Gumroad webhook received:", { email, productPermalink, refunded, auth });

    if (!email) {
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    const pending = await findPending(email);
    if (auth === "fallback" && !pending && !refunded) {
      console.error("Rejected Gumroad ping without pending checkout for", email);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const account = await findUser(email, pending?.user_id);

    if (refunded) {
      if (account) {
        await supabaseAdmin.from("users").update({ plan: "free" }).eq("id", account.id);
      } else {
        await supabaseAdmin.from("users").update({ plan: "free" }).ilike("email", email);
      }
      if (purchaseId) {
        await supabaseAdmin
          .from("confirmed_purchases")
          .update({ refunded: true, fully_refunded: true })
          .eq("purchase_id", purchaseId);
      }
      console.log(`Downgraded ${email} to free (refund)`);
      return NextResponse.json({ success: true });
    }

    const planType = resolveGumroadPlanType({
      permalink: productPermalink,
      productName: params.get("product_name"),
      pendingPlanType: pending?.plan_type,
      monthlyPermalink: process.env.GUMROAD_PRO_MONTHLY_URL || process.env.GUMROAD_UNLIMITED_URL,
      yearlyPermalink:
        process.env.GUMROAD_GROWTH_URL ||
        process.env.GUMROAD_PRO_YEARLY_URL ||
        process.env.GUMROAD_UNLIMITED_URL,
    });

    if (!planType) {
      console.error("Could not determine plan type for:", email, productPermalink);
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    if (!account) {
      console.error("Gumroad purchase has no matching user:", email, pending?.user_id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const purchasedAt = new Date(
      params.get("sale_timestamp") || params.get("created_at") || Date.now(),
    ).toISOString();
    const confirmedPurchaseId = purchaseId || `gumroad-${account.id}-${Date.parse(purchasedAt)}`;

    const granted = await grantProPlan({
      userId: account.id,
      email: account.email || email,
      planType: planType as PaidPlanType,
      purchaseId: confirmedPurchaseId,
      purchasedAt,
      itemName: params.get("product_name") || params.get("product_permalink"),
      buyerName: params.get("full_name") || params.get("buyer_name"),
      buyerEmail: params.get("buyer_email") || email,
      salePrice: Number(params.get("price") || params.get("sale_price") || 0),
    });

    if (!granted.ok) {
      return NextResponse.json({ error: granted.error || "Failed to update plan" }, { status: 500 });
    }

    await supabaseAdmin.from("pending_purchases").delete().eq("user_id", account.id);
    await supabaseAdmin.from("pending_purchases").delete().ilike("email", email);

    console.log(`✅ Upgraded ${account.email || email} to pro (plan: ${planType})`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error("Webhook error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
