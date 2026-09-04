import { createSupabaseServerClient } from "./supabase-server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "./adminEmails";
import {
  normalizeEmail,
  planExpiresAt,
  postgrestOrExact,
  type PaidPlanType,
} from "./purchases";
import { createSupabasePurchaseStore } from "./gumroadPurchase";
import { UserCredits } from "./types";

const ADMIN_PRO_EXPIRES_AT = "2099-12-31T00:00:00.000Z";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type ConfirmedPurchase = {
  user_id?: string | null;
  plan_type: "pro_monthly" | "pro_yearly";
  purchased_at: string;
  subscription_end_date: string | null;
  refunded: boolean;
  fully_refunded: boolean;
  disputed: boolean;
  access_revoked: boolean;
};

function purchaseExpiry(purchase: ConfirmedPurchase): Date | null {
  if (purchase.subscription_end_date) return new Date(purchase.subscription_end_date);
  const expiry = new Date(purchase.purchased_at);
  if (Number.isNaN(expiry.getTime())) return null;
  if (purchase.plan_type === "pro_yearly") expiry.setFullYear(expiry.getFullYear() + 1);
  else expiry.setMonth(expiry.getMonth() + 1);
  return expiry;
}

export async function ensureAdminProPlan(user: { id: string; email: string }): Promise<void> {
  if (!isAdminEmail(user.email)) return;
  try {
    const admin = supabaseAdmin();
    const { error: planError } = await admin
      .from("users")
      .update({
        plan: "pro",
        plan_type: "pro_yearly",
        plan_expires_at: ADMIN_PRO_EXPIRES_AT,
      })
      .eq("id", user.id);
    if (planError) {
      console.error("Failed to keep admin on Pro plan", planError);
    }

    const purchaseRow = {
      purchase_id: `admin-${user.email.trim().toLowerCase()}`,
      plan_type: "pro_yearly",
      item_name: "Admin Pro",
      purchase_email: user.email,
      user_email: user.email,
      purchased_at: new Date().toISOString(),
      subscription_end_date: ADMIN_PRO_EXPIRES_AT,
      refunded: false,
      fully_refunded: false,
      disputed: false,
      access_revoked: false,
    };
    const { error: purchaseError } = await admin
      .from("confirmed_purchases")
      .upsert({ ...purchaseRow, user_id: user.id }, { onConflict: "purchase_id" });
    if (purchaseError) {
      console.error("Failed to record admin Pro purchase", purchaseError);
      const { error: retryError } = await admin
        .from("confirmed_purchases")
        .upsert(purchaseRow, { onConflict: "purchase_id" });
      if (retryError) {
        console.error("Failed to record admin Pro purchase without user_id", retryError);
      }
    }
  } catch (err) {
    console.error("ensureAdminProPlan failed", err);
  }
}

export async function grantProPlan(input: {
  userId: string;
  email: string;
  planType: PaidPlanType;
  purchaseId: string;
  purchasedAt?: string;
  itemName?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  salePrice?: number;
  auditReason?: string | null;
}): Promise<{ ok: boolean; error?: string; alreadyProcessed?: boolean }> {
  const purchasedAt = input.purchasedAt || new Date().toISOString();
  const expiresAt = planExpiresAt(input.planType, new Date(purchasedAt));
  const store = createSupabasePurchaseStore(supabaseAdmin());
  const granted = await store.applyGrant({
    saleId: input.purchaseId,
    userId: input.userId,
    accountEmail: normalizeEmail(input.email),
    planType: input.planType,
    purchasedAt,
    expiresAt,
    itemName: input.itemName ?? null,
    buyerName: input.buyerName ?? null,
    buyerEmail: input.buyerEmail ?? null,
    salePrice: input.salePrice ?? 0,
    auditReason: input.auditReason ?? null,
  });
  if (!granted.ok) return { ok: false, error: granted.error };
  return { ok: true, alreadyProcessed: granted.alreadyProcessed };
}

async function hasActiveConfirmedProPurchase(userId: string, email: string): Promise<ConfirmedPurchase | null> {
  const admin = supabaseAdmin();
  const normalized = normalizeEmail(email);
  const emailOr = postgrestOrExact(
    ["purchase_email", "buyer_email", "user_email"],
    normalized,
  );

  async function query(filter: string) {
    return admin
      .from("confirmed_purchases")
      .select("plan_type, purchased_at, subscription_end_date, refunded, fully_refunded, disputed, access_revoked")
      .or(filter);
  }

  let { data, error } = await query(`user_id.eq.${userId},${emailOr}`);
  if (error) {
    const retry = await query(emailOr);
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    console.error("Unable to verify Pro purchase", error);
    return null;
  }

  const active = ((data ?? []) as unknown as ConfirmedPurchase[]).filter((purchase) => {
    if (purchase.refunded || purchase.fully_refunded || purchase.disputed || purchase.access_revoked) return false;
    const expiry = purchaseExpiry(purchase);
    return Boolean(expiry && expiry.getTime() > Date.now());
  });
  active.sort((a, b) => {
    const aTime = new Date(a.subscription_end_date || a.purchased_at).getTime();
    const bTime = new Date(b.subscription_end_date || b.purchased_at).getTime();
    return bTime - aTime;
  });
  return active[0] ?? null;
}

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, plan, tailor_count, tailor_reset_date, plan_expires_at, plan_type")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const credits = data as UserCredits;
  if (isAdminEmail(credits.email)) {
    const expiresAt = credits.plan_expires_at;
    const alreadyPro = credits.plan === "pro" && expiresAt && new Date(expiresAt).getTime() > Date.now();
    if (!alreadyPro) {
      await ensureAdminProPlan({ id: credits.id, email: credits.email });
    }
    return { ...credits, plan: "pro" };
  }

  const confirmed = await hasActiveConfirmedProPurchase(credits.id, credits.email);
  if (confirmed) {
    const expiresAt = purchaseExpiry(confirmed)?.toISOString() ?? credits.plan_expires_at ?? null;
    const alreadyPro =
      credits.plan === "pro" &&
      expiresAt &&
      new Date(expiresAt).getTime() > Date.now() &&
      credits.plan_type === confirmed.plan_type;
    if (!alreadyPro) {
      await supabaseAdmin()
        .from("users")
        .update({
          plan: "pro",
          plan_type: confirmed.plan_type,
          plan_expires_at: expiresAt,
        })
        .eq("id", credits.id);
    }
    return { ...credits, plan: "pro", plan_type: confirmed.plan_type, plan_expires_at: expiresAt };
  }

  if (credits.plan !== "pro") return credits;

  const expiresAt = credits.plan_expires_at;
  if (expiresAt && new Date(expiresAt).getTime() > Date.now()) return credits;

  return {
    ...credits,
    plan: "expired",
  };
}

export type TailorUsageDecision =
  | { action: "skip_pro" }
  | { action: "deny" }
  | { action: "increment"; tailor_count: number; tailor_reset_date?: string };

export function computeNextTailorUsage(user: UserCredits, now = new Date()): TailorUsageDecision {
  if (user.plan === "pro") return { action: "skip_pro" };
  if (user.plan === "expired") return { action: "deny" };
  const resetDate = new Date(user.tailor_reset_date);
  if (now >= resetDate) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { action: "increment", tailor_count: 1, tailor_reset_date: nextReset.toISOString() };
  }
  if (user.tailor_count >= 3) return { action: "deny" };
  return { action: "increment", tailor_count: user.tailor_count + 1 };
}

export function creditActionForOutcome(
  isAdmin: boolean,
  outcome: "success" | "failed",
): "deduct" | "none" {
  return !isAdmin && outcome === "success" ? "deduct" : "none";
}

export async function deductTailorCredit(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user) return false;

  const decision = computeNextTailorUsage(user);
  if (decision.action === "skip_pro") return true;
  if (decision.action === "deny") return false;

  const update: { tailor_count: number; tailor_reset_date?: string } = {
    tailor_count: decision.tailor_count,
  };
  if (decision.tailor_reset_date) update.tailor_reset_date = decision.tailor_reset_date;

  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", userId);
  return !error;
}

export function hasTailorCredits(user: UserCredits): boolean {
  if (user.plan === "pro") return true;
  if (user.plan === "expired") return false;
  if (new Date() >= new Date(user.tailor_reset_date)) return true;
  return user.tailor_count < 3;
}

export function hasJobCredits(user: UserCredits): boolean {
  return user.plan === "pro";
}
