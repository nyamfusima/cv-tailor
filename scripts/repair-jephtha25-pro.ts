/**
 * One-time production repair for the 3 Sep 2026 Pro Monthly purchase.
 *
 * Loads .env.local when present. Applies the Gmail-only grant using
 * apply_pro_purchase when that RPC exists, otherwise updates users +
 * confirmed_purchases with the current production schema.
 *
 * Usage:
 *   npx tsx scripts/repair-jephtha25-pro.ts
 *
 * This file is the only production path allowed to mention jephtha25@gmail.com.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TARGET_EMAIL = "jephtha25@gmail.com";
const UNIVERSITY_EMAIL = "3810895@myuwc.ac.za";
const AUDIT_REASON =
  "Historical repair: Gumroad Pro Monthly purchase for jephtha25@gmail.com did not grant dashboard credits.";
const PURCHASED_AT = "2026-09-03T09:29:00.000Z";
const EXPIRES_AT = "2026-10-03T09:29:00.000Z";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("BLOCKED: production database credentials are unavailable in this environment.");
    console.log("Apply these files in the Supabase SQL editor, in order:");
    console.log("1. supabase/migrations/20260904_atomic_gumroad_pro_grants.sql");
    console.log("2. supabase/migrations/20260904_repair_jephtha25_gmail_pro.sql");
    process.exit(2);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: accounts, error: userError } = await admin
    .from("users")
    .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
    .ilike("email", TARGET_EMAIL);

  if (userError) {
    console.log("BLOCKED: could not look up the Gmail user.", userError.message);
    process.exit(1);
  }
  if (!accounts || accounts.length === 0) {
    console.log("BLOCKED: no authenticated user for jephtha25@gmail.com");
    process.exit(1);
  }
  if (accounts.length > 1) {
    console.log("BLOCKED: multiple users rows for jephtha25@gmail.com");
    process.exit(1);
  }

  const account = accounts[0];
  const { data: existingPurchases } = await admin
    .from("confirmed_purchases")
    .select("purchase_id, purchased_at, subscription_end_date, purchase_email, user_email, buyer_email")
    .or(
      `purchase_email.eq."${TARGET_EMAIL}",user_email.eq."${TARGET_EMAIL}",buyer_email.eq."${TARGET_EMAIL}",user_id.eq.${account.id}`,
    )
    .gte("purchased_at", "2026-09-03T00:00:00+02:00")
    .lt("purchased_at", "2026-09-04T00:00:00+02:00");

  const existing = (existingPurchases ?? [])[0] as
    | {
        purchase_id: string;
        purchased_at: string | null;
        subscription_end_date: string | null;
      }
    | undefined;

  const saleId = existing?.purchase_id || "repair-jephtha25-2026-09-03";
  const missingStableId = !existing || /^(repair-|manual-|gumroad-)/.test(saleId);
  const purchasedAt = existing?.purchased_at || PURCHASED_AT;
  const expiresAt = existing?.subscription_end_date || EXPIRES_AT;

  const { data: existingGrant } = await admin
    .from("purchase_credit_grants")
    .select("sale_id")
    .eq("sale_id", saleId)
    .maybeSingle();

  if (existingGrant) {
    console.log("Grant already recorded for this sale; ensuring the Gmail user plan is Pro.");
  } else {
    const rpc = await admin.rpc("apply_pro_purchase", {
      p_sale_id: saleId,
      p_user_id: account.id,
      p_account_email: TARGET_EMAIL,
      p_plan_type: "pro_monthly",
      p_purchased_at: purchasedAt,
      p_expires_at: expiresAt,
      p_item_name: "Pro Monthly",
      p_buyer_name: "Monique Jephtha",
      p_buyer_email: TARGET_EMAIL,
      p_sale_price: 98.97,
      p_audit_reason: AUDIT_REASON,
    });

    if (rpc.error) {
      const { error: planError } = await admin
        .from("users")
        .update({
          plan: "pro",
          plan_type: "pro_monthly",
          plan_expires_at: expiresAt,
        })
        .eq("id", account.id);
      if (planError) {
        console.log("BLOCKED: failed to update Gmail user plan.", planError.message);
        process.exit(1);
      }

      const purchaseRow: Record<string, unknown> = {
        purchase_id: saleId,
        plan_type: "pro_monthly",
        item_name: "Pro Monthly",
        buyer_name: "Monique Jephtha",
        purchase_email: TARGET_EMAIL,
        buyer_email: TARGET_EMAIL,
        user_email: TARGET_EMAIL,
        purchased_at: purchasedAt,
        subscription_end_date: expiresAt,
        sale_price: 98.97,
        refunded: false,
        fully_refunded: false,
        disputed: false,
        access_revoked: false,
      };
      const withUserId = { ...purchaseRow, user_id: account.id };
      const firstTry = await admin.from("confirmed_purchases").upsert(withUserId, { onConflict: "purchase_id" });
      if (firstTry.error) {
        const retry = await admin.from("confirmed_purchases").upsert(purchaseRow, { onConflict: "purchase_id" });
        if (retry.error) {
          console.log("BLOCKED: failed to record the Gmail purchase.", retry.error.message);
          process.exit(1);
        }
      }
    }
  }

  const { data: repaired } = await admin
    .from("users")
    .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
    .eq("id", account.id)
    .single();

  const { data: university } = await admin
    .from("users")
    .select("id, plan, plan_expires_at")
    .ilike("email", UNIVERSITY_EMAIL)
    .maybeSingle();

  const remaining =
    repaired?.plan === "pro" ? null : Math.max(0, 3 - (repaired?.tailor_count ?? 0));

  console.log(
    JSON.stringify(
      {
        repaired_user_id: repaired?.id,
        repaired_email: TARGET_EMAIL,
        plan: repaired?.plan,
        plan_type: repaired?.plan_type,
        plan_expires_at: repaired?.plan_expires_at,
        tailor_count: repaired?.tailor_count,
        remaining_credits: remaining,
        credits_unlimited: repaired?.plan === "pro",
        sale_id: saleId,
        missing_stable_gumroad_sale_id: missingStableId,
        university_user_id: university?.id ?? null,
        university_plan_left_as: university?.plan ?? null,
      },
      null,
      2,
    ),
  );

  if (repaired?.plan !== "pro") {
    process.exit(1);
  }
}

void main();
