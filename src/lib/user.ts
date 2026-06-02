import { createSupabaseServerClient } from "./supabase-server";
import { UserCredits } from "./types";

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, plan, tailor_count, tailor_reset_date")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserCredits;
}

export async function deductTailorCredit(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user) return false;

  if (user.plan === "pro") return true;

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
  // If the monthly reset date has passed the next deduct will reset the count
  if (new Date() >= new Date(user.tailor_reset_date)) return true;
  return user.tailor_count < 3;
}

export function hasJobCredits(user: UserCredits): boolean {
  return user.plan === "pro";
}
