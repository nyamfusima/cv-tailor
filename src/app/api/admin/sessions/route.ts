import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nyamfusima@gmail.com";

type AdminProUser = {
  id: string;
  email: string;
  plan: "pro";
  plan_type: "pro_monthly" | "pro_yearly" | null;
  plan_expires_at: string | null;
};

function monthlyExpiry(purchasedAt: string | null): string | null {
  if (!purchasedAt) return null;
  const expiry = new Date(purchasedAt);
  if (Number.isNaN(expiry.getTime())) return null;
  expiry.setMonth(expiry.getMonth() + 1);
  return expiry.toISOString();
}

export async function GET(_req: NextRequest) {
  try {
    // Validate the requester using the session cookies (anon key)
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    // Use the service role on the server only (never expose to the client)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("tailor_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch sessions", error);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    const totalSessions = data.length;
    const uniqueUsers = new Set(data.map((s) => s.user_email)).size;
    const avgScore =
      data.length > 0
        ? Math.round(
            data.reduce((sum, s) => sum + (s.match_score || 0), 0) /
              data.length
          )
        : 0;
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = data.filter((s) =>
      (s as any).created_at?.startsWith(today)
    ).length;

    const { data: proUsers, error: proUsersError } = await supabaseAdmin
      .from("users")
      .select("id, email, plan, plan_type, plan_expires_at")
      .eq("plan", "pro")
      .order("plan_expires_at", { ascending: true, nullsFirst: false });

    if (proUsersError) {
      // Keep the historical sessions dashboard available until the optional
      // subscription-expiry migration has been applied.
      console.error("Failed to fetch Pro users", proUsersError);
    }

    // Older paid subscriptions may still be held in pending_purchases. Include
    // their monthly plan records in the admin view without mutating payment data.
    const { data: pendingPurchases, error: pendingPurchasesError } = await supabaseAdmin
      .from("pending_purchases")
      .select("user_id, email, plan_type, created_at")
      .eq("plan_type", "pro_monthly")
      .order("created_at", { ascending: false });

    if (pendingPurchasesError) {
      console.error("Failed to fetch pending Pro purchases", pendingPurchasesError);
    }

    const proUsersByEmail = new Map<string, AdminProUser>();
    if (!proUsersError) {
      (proUsers ?? []).forEach((proUser) => {
        proUsersByEmail.set(proUser.email, proUser as AdminProUser);
      });
    }

    if (!pendingPurchasesError) {
      (pendingPurchases ?? []).forEach((purchase) => {
        if (!purchase.email) return;
        const pendingProUser: AdminProUser = {
          id: purchase.user_id ? `pending-${purchase.user_id}` : `pending-${purchase.email}`,
          email: purchase.email,
          plan: "pro",
          plan_type: "pro_monthly",
          plan_expires_at: monthlyExpiry(purchase.created_at),
        };
        const existing = proUsersByEmail.get(purchase.email);
        if (!existing || !existing.plan_expires_at) {
          proUsersByEmail.set(purchase.email, pendingProUser);
        }
      });
    }

    const adminProUsers = Array.from(proUsersByEmail.values()).sort((a, b) => {
      if (!a.plan_expires_at) return 1;
      if (!b.plan_expires_at) return -1;
      return new Date(a.plan_expires_at).getTime() - new Date(b.plan_expires_at).getTime();
    });

    return NextResponse.json({
      sessions: data,
      proUsers: adminProUsers,
      stats: {
        totalSessions,
        totalUsers: uniqueUsers,
        avgScore,
        todaySessions,
      },
    });
  } catch (err) {
    console.error("Admin sessions API error", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
