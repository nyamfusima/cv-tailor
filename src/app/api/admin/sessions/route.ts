import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_LIST_LIMIT,
  aggregateSessionStats,
  fetchAllPaged,
  startOfTodayJohannesburg,
} from "@/lib/admin/sessionStats";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nyamfusima@gmail.com";

type AdminProUser = {
  id: string;
  email: string;
  plan: "pro";
  plan_type: "pro_monthly" | "pro_yearly" | null;
  plan_expires_at: string | null;
  buyer_name: string | null;
  purchased_at: string | null;
};

function monthlyExpiry(purchasedAt: string | null): string | null {
  if (!purchasedAt) return null;
  const expiry = new Date(purchasedAt);
  if (Number.isNaN(expiry.getTime())) return null;
  expiry.setMonth(expiry.getMonth() + 1);
  return expiry.toISOString();
}

export async function GET() {
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

    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("tailor_sessions")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("Failed to count sessions", countError);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    const { count: todayCount, error: todayError } = await supabaseAdmin
      .from("tailor_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayJohannesburg());

    if (todayError) {
      console.error("Failed to count today's sessions", todayError);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    let statRows: { user_email: string | null; match_score: number | null }[] = [];
    try {
      statRows = await fetchAllPaged(async (from, to) => {
        const { data: page, error: pageError } = await supabaseAdmin
          .from("tailor_sessions")
          .select("user_email, match_score")
          .range(from, to);
        if (pageError) throw pageError;
        return page ?? [];
      });
    } catch (pageError) {
      console.error("Failed to page session stats", pageError);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("tailor_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, ADMIN_SESSION_LIST_LIMIT - 1);

    if (error) {
      console.error("Failed to fetch sessions", error);
      return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
    }

    const stats = aggregateSessionStats({
      totalSessions: totalCount ?? 0,
      todaySessions: todayCount ?? 0,
      listedSessions: data?.length ?? 0,
      rows: statRows,
    });

    const { data: confirmedPurchases, error: confirmedPurchasesError } = await supabaseAdmin
      .from("confirmed_purchases")
      .select("purchase_id, plan_type, buyer_name, purchase_email, buyer_email, user_email, purchased_at, subscription_end_date, refunded, fully_refunded, disputed, access_revoked")
      .in("plan_type", ["pro_monthly", "pro_yearly"])
      .order("purchased_at", { ascending: false });

    if (confirmedPurchasesError) {
      // The rest of the admin page remains available until this migration is applied.
      console.error("Failed to fetch confirmed purchases", confirmedPurchasesError);
    }

    const proUsersByEmail = new Map<string, AdminProUser>();
    if (!confirmedPurchasesError) {
      (confirmedPurchases ?? []).forEach((purchase) => {
        if (purchase.refunded || purchase.fully_refunded || purchase.disputed || purchase.access_revoked) return;
        const email = purchase.purchase_email || purchase.buyer_email || purchase.user_email;
        if (!email) return;
        const planType = purchase.plan_type as "pro_monthly" | "pro_yearly";
        const expiresAt = purchase.subscription_end_date || (planType === "pro_monthly"
          ? monthlyExpiry(purchase.purchased_at)
          : (() => {
              if (!purchase.purchased_at) return null;
              const expiry = new Date(purchase.purchased_at);
              expiry.setFullYear(expiry.getFullYear() + 1);
              return expiry.toISOString();
            })());

        const confirmedProUser: AdminProUser = {
          id: purchase.purchase_id,
          email,
          plan: "pro",
          plan_type: planType,
          plan_expires_at: expiresAt,
          buyer_name: purchase.buyer_name,
          purchased_at: purchase.purchased_at,
        };
        const existing = proUsersByEmail.get(email);
        if (!existing || (confirmedProUser.purchased_at && (!existing.purchased_at || confirmedProUser.purchased_at > existing.purchased_at))) {
          proUsersByEmail.set(email, confirmedProUser);
        }
      });
    }

    const adminProUsers = Array.from(proUsersByEmail.values()).sort((a, b) => {
      if (!a.plan_expires_at) return 1;
      if (!b.plan_expires_at) return -1;
      return new Date(a.plan_expires_at).getTime() - new Date(b.plan_expires_at).getTime();
    });

    return NextResponse.json({
      sessions: data ?? [],
      proUsers: adminProUsers,
      stats,
    });
  } catch (err) {
    console.error("Admin sessions API error", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
