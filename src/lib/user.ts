import { createSupabaseServerClient } from "./supabase-server";

export interface UserData {
  id: string;
  email: string;
  plan: "free" | "pro";
  tailor_count: number;
  tailor_reset_date: string;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
}

export async function getUserData(userId: string): Promise<UserData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserData;
}

export async function incrementTailorCount(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const userData = await getUserData(userId);
  if (!userData) return;

  // Reset count if month has passed
  const resetDate = new Date(userData.tailor_reset_date);
  const now = new Date();

  if (now > resetDate) {
    await supabase
      .from("users")
      .update({
        tailor_count: 1,
        tailor_reset_date: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1
        ).toISOString(),
      })
      .eq("id", userId);
    return;
  }

  await supabase
    .from("users")
    .update({ tailor_count: userData.tailor_count + 1 })
    .eq("id", userId);
}

export function canTailor(userData: UserData): boolean {
  if (userData.plan === "pro") return true;
  return userData.tailor_count < 3;
}

export function tailorsRemaining(userData: UserData): number {
  if (userData.plan === "pro") return Infinity;
  return Math.max(0, 3 - userData.tailor_count);
}