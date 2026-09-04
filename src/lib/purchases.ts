export type PaidPlanType = "pro_monthly" | "pro_yearly";

const VALID_PLANS = new Set<PaidPlanType>(["pro_monthly", "pro_yearly"]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Free-tier tailor allowance used by the dashboard remaining-credit calculation. */
export const FREE_TAILOR_CREDITS = 3;

/**
 * Paid-plan credit allocation. Pro is an unlimited entitlement for the billing
 * period — the dashboard shows a Pro badge, not a remaining count.
 */
export const PAID_PLAN_CONFIG = {
  pro_monthly: { durationMonths: 1, tailorCredits: "unlimited" as const },
  pro_yearly: { durationMonths: 12, tailorCredits: "unlimited" as const },
};

export function remainingDashboardCredits(user: {
  plan: string;
  tailor_count: number;
}): number | null {
  if (user.plan === "pro") return null;
  if (user.plan === "expired") return 0;
  return Math.max(0, FREE_TAILOR_CREDITS - user.tailor_count);
}

export function toAccountPlanResponse(user: {
  plan: string;
  tailor_count: number;
  tailor_reset_date: string;
  plan_expires_at?: string | null;
  plan_type?: string | null;
}) {
  const remaining = remainingDashboardCredits(user);
  return {
    plan: user.plan,
    tailor_count: user.tailor_count,
    tailor_reset_date: user.tailor_reset_date,
    plan_expires_at: user.plan_expires_at ?? null,
    plan_type: user.plan_type ?? null,
    remaining_credits: remaining,
    credits_unlimited: user.plan === "pro",
  };
}

export function postgrestEq(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function postgrestOrExact(columns: string[], value: string): string {
  const quoted = postgrestEq(value);
  return columns.map((column) => `${column}.eq.${quoted}`).join(",");
}

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
  expiresAt.setMonth(expiresAt.getMonth() + PAID_PLAN_CONFIG[planType].durationMonths);
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
