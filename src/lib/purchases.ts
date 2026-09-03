export type PaidPlanType = "pro_monthly" | "pro_yearly";

const VALID_PLANS = new Set<PaidPlanType>(["pro_monthly", "pro_yearly"]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const MANUAL_PRO_GRANTS: Record<string, { planType: PaidPlanType; buyerName: string }> = {
  "3810895@myuwc.ac.za": { planType: "pro_monthly", buyerName: "Monique" },
};

export function gumroadPermalinkFromUrl(raw?: string | null): string {
  if (!raw) return "";
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://gumroad.com/l/${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    return (parts[parts.length - 1] || "").toLowerCase();
  } catch {
    return raw.split("/").filter(Boolean).pop()?.toLowerCase() || "";
  }
}

export function planExpiresAt(planType: PaidPlanType, from = new Date()): string {
  const expiresAt = new Date(from);
  expiresAt.setMonth(expiresAt.getMonth() + (planType === "pro_yearly" ? 12 : 1));
  return expiresAt.toISOString();
}

export function resolveGumroadPlanType(input: {
  permalink?: string | null;
  productName?: string | null;
  pendingPlanType?: string | null;
  monthlyPermalink?: string | null;
  yearlyPermalink?: string | null;
}): PaidPlanType | null {
  const pending = input.pendingPlanType?.trim();
  if (pending && VALID_PLANS.has(pending as PaidPlanType)) return pending as PaidPlanType;

  const permalink = gumroadPermalinkFromUrl(input.permalink);
  if (VALID_PLANS.has(permalink as PaidPlanType)) return permalink as PaidPlanType;

  const monthly = gumroadPermalinkFromUrl(input.monthlyPermalink);
  const yearly = gumroadPermalinkFromUrl(input.yearlyPermalink);
  if (permalink && monthly && permalink === monthly) return "pro_monthly";
  if (permalink && yearly && permalink === yearly) return "pro_yearly";

  const name = (input.productName || "").toLowerCase();
  if (/\byear/.test(name)) return "pro_yearly";
  if (/\bmonth/.test(name)) return "pro_monthly";
  return null;
}
