"use client";

import Link from "next/link";

import { Pricing2, type BillingCycle, type PlanId } from "@/components/ui/pricing2";
import { useAuth } from "@/lib/auth";

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();

  const handlePlanSelect = async (planId: PlanId, billingCycle: BillingCycle) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    if (planId === "free") {
      window.location.assign("/upload");
      return;
    }

    const planType = billingCycle === "yearly" ? "pro_yearly" : "pro_monthly";
    window.location.assign(`/api/checkout?type=${planType}`);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#1a3a6b]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(125,211,252,0.16),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.14),transparent_42%)]" />

        <nav className="relative z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-semibold text-white tracking-tight text-lg">my</span>
            <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
            <span className="font-semibold text-white tracking-tight text-lg">tailor.ai</span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/upload"
                className="text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white transition-all hover:-translate-y-0.5"
              >
                Go to app -&gt;
              </Link>
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all border border-white/25 text-white/90 hover:text-white"
                >
                  Sign in
                </button>
                <button
                  onClick={signInWithGoogle}
                  className="text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white transition-all hover:-translate-y-0.5"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </nav>

      </div>

      <Pricing2
        id="pricing"
        heading="Free or Pro. Nothing in between."
        description="2 clear choices, no decision fatigue."
        onPlanSelect={handlePlanSelect}
        className="pt-16"
      />
    </div>
  );
}
