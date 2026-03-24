import { createSupabaseServerClient } from "./supabase-server";
import { UserCredits } from "./types";

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserCredits;
}

export async function deductTailorCredit(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user || user.tailor_credits <= 0) return false;

  const { error } = await supabase
    .from("users")
    .update({
      tailor_credits: user.tailor_credits - 1,
      total_tailors_used: user.total_tailors_used + 1,
    })
    .eq("id", userId);

  return !error;
}

export async function deductPDFCredit(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user || user.pdf_credits <= 0) return false;

  const { error } = await supabase
    .from("users")
    .update({ pdf_credits: user.pdf_credits - 1 })
    .eq("id", userId);

  return !error;
}

export async function addCredits(
  userId: string,
  tailorCredits: number,
  pdfCredits: number
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getUserCredits(userId);
  if (!user) return;

  await supabase
    .from("users")
    .update({
      tailor_credits: user.tailor_credits + tailorCredits,
      pdf_credits: user.pdf_credits + pdfCredits,
    })
    .eq("id", userId);
}

export function hasTailorCredits(user: UserCredits): boolean {
  return user.tailor_credits > 0;
}

export function hasPDFCredits(user: UserCredits): boolean {
  return user.pdf_credits > 0;
}