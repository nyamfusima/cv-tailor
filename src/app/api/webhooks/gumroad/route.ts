import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  createSupabasePurchaseStore,
  defaultGumroadLogger,
  extractGumroadPing,
  parseGumroadPing,
  processGumroadSale,
} from "@/lib/gumroadPurchase";

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
  if (incomingSeller || params.get("sale_id") || params.get("purchase_id")) {
    return "fallback";
  }
  return "bad";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = parseGumroadPing(body);
    const auth = verifyGumroadPing(req, params);
    if (auth === "bad") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const ping = extractGumroadPing(params);
    const store = createSupabasePurchaseStore(supabaseAdmin);
    const result = await processGumroadSale(store, ping, {
      auth,
      monthlyPermalink: process.env.GUMROAD_PRO_MONTHLY_URL || process.env.GUMROAD_UNLIMITED_URL,
      yearlyPermalink:
        process.env.GUMROAD_GROWTH_URL ||
        process.env.GUMROAD_PRO_YEARLY_URL ||
        process.env.GUMROAD_UNLIMITED_URL,
      logger: defaultGumroadLogger,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error(JSON.stringify({ msg: "gumroad_webhook", event: "database_error", error: message }));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
