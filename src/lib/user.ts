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

export async function deductTailorCredit(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user) return false;

  if (user.plan === "pro") return true;
  if (user.plan === "expired") return false;

  const now = new Date();
  const resetDate = new Date(user.tailor_reset_date);

  if (now >= resetDate) {
    // Monthly reset: count this use as 1 and advance the reset date to start of next month
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const { error } = await supabase
      .from("users")
      .update({ tailor_count: 1, tailor_reset_date: nextReset.toISOString() })
      .eq("id", userId);
    return !error;
  }

  if (user.tailor_count >= 3) return false;

  const { error } = await supabase
    .from("users")
    .update({ tailor_count: user.tailor_count + 1 })
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
