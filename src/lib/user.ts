import { createSupabaseServerClient } from "./supabase-server";
import { createClient } from "@supabase/supabase-js";
import { UserCredits } from "./types";

type ConfirmedPurchase = {
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

async function hasActiveConfirmedProPurchase(email: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabaseAdmin
    .from("confirmed_purchases")
    .select("plan_type, purchased_at, subscription_end_date, refunded, fully_refunded, disputed, access_revoked")
    .or(`purchase_email.eq.${email},buyer_email.eq.${email},user_email.eq.${email}`);

  if (error) {
    // Fail closed: a paid plan must have a verifiable confirmed purchase.
    console.error("Unable to verify Pro purchase", error);
    return false;
  }

  return ((data ?? []) as ConfirmedPurchase[]).some((purchase) => {
    if (purchase.refunded || purchase.fully_refunded || purchase.disputed || purchase.access_revoked) return false;
    const expiry = purchaseExpiry(purchase);
    return Boolean(expiry && expiry.getTime() > Date.now());
  });
}

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, plan, tailor_count, tailor_reset_date")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const credits = data as UserCredits;
  if (credits.plan !== "pro") return credits;

  return {
    ...credits,
    plan: (await hasActiveConfirmedProPurchase(credits.email)) ? "pro" : "expired",
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
  // If the monthly reset date has passed the next deduct will reset the count
  if (new Date() >= new Date(user.tailor_reset_date)) return true;
  return user.tailor_count < 3;
}

export function hasJobCredits(user: UserCredits): boolean {
  return user.plan === "pro";
}
