"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type PlanFeature = {
  text: string;
  included: boolean;
};

type Plan = {
  name: string;
  price: string;
  cadence: string;
  desc: string;
  popular: boolean;
  variant: "free" | "pro";
  savings?: string;
  monthlyPlanType?: string;
  yearlyPlanType?: string;
  features: PlanFeature[];
};

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();

  const handleCheckout = async (planType: string) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    window.location.assign(`/api/checkout?type=${planType}`);
  };

  const plans: Plan[] = [
    {
      name: "Free",
      price: "$0",
      cadence: "one time",
      desc: "Enough to prove value without giving away the full stack forever.",
      popular: false,
      variant: "free",
      features: [
        { text: "3 CV tailors total (one time)", included: true },
        { text: "3 PDF downloads", included: true },
        { text: "ATS score", included: true },
        { text: "Job match (limited - 3 searches)", included: true },
        { text: "No cover letter", included: false },
      ],
    },
    {
      name: "Pro",
      price: "$12",
      cadence: "/month or $99/year",
      desc: "Built for serious job seekers who want speed, volume, and better conversion.",
      popular: true,
      variant: "pro",
      monthlyPlanType: "pro_monthly",
      yearlyPlanType: "pro_yearly",
      savings: "Save 31% with annual billing ($8.25/month)",
      features: [
        { text: "Unlimited CV tailors", included: true },
        { text: "Unlimited PDF downloads", included: true },
        { text: "Unlimited job matches", included: true },
        { text: "Cover letter generator", included: true },
        { text: "ATS score + full breakdown", included: true },
        { text: "Master CV storage", included: true },
        { text: "Dashboard + history", included: true },
        { text: "Priority processing", included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .float { animation: float 3s ease-in-out infinite; }
        .feature-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .feature-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(13,31,60,0.10); }
        .cta-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(13,31,60,0.3); }
      `}</style>

      <nav className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-semibold text-white tracking-tight text-lg">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-white tracking-tight text-lg">tailor.ai</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/upload" className="cta-btn text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white">
              Go to app -&gt;
            </Link>
          ) : (
            <>
              <button
                onClick={signInWithGoogle}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                style={{ color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Sign in
              </button>
              <button
                onClick={signInWithGoogle}
                className="cta-btn text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3">
            Pricing
          </p>
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-3xl sm:text-4xl text-slate-900 text-center mb-4"
          >
            Free or Pro. Nothing in between.
          </h2>
          <p className="text-slate-500 text-center text-base mb-14">
            Two clear choices, no decision fatigue.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: plan.popular ? "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" : "white",
                  border: plan.popular ? "none" : "1px solid #e2e8f0",
                  boxShadow: plan.popular ? "0 20px 60px rgba(13,31,60,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
                    >
                      Most popular
                    </span>
                  </div>
                )}

                <div className="p-7">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                  >
                    {plan.name}
                  </p>

                  <div className="flex items-end gap-1 mb-2">
                    <span
                      className="text-4xl font-bold"
                      style={{ fontFamily: "'DM Serif Display', serif", color: plan.popular ? "white" : "#0d1f3c" }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm mb-1.5" style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}>
                      {plan.cadence}
                    </span>
                  </div>

                  {plan.savings && (
                    <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {plan.savings}
                    </p>
                  )}

                  <p className="text-xs mb-6 leading-relaxed" style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}>
                    {plan.desc}
                  </p>

                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-3 text-sm">
                        {f.included ? (
                          <svg className="w-4 h-4 shrink-0" style={{ color: plan.popular ? "rgba(255,255,255,0.6)" : "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 shrink-0" style={{ color: plan.popular ? "rgba(255,255,255,0.2)" : "#cbd5e1" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span
                          style={{
                            color: f.included
                              ? plan.popular
                                ? "rgba(255,255,255,0.85)"
                                : "#374151"
                              : plan.popular
                                ? "rgba(255,255,255,0.3)"
                                : "#cbd5e1",
                          }}
                        >
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.variant === "free" ? (
                    <button
                      onClick={() => {
                        if (!user) {
                          signInWithGoogle();
                        } else {
                          window.location.assign("/upload");
                        }
                      }}
                      className="w-full font-semibold py-3 rounded-xl text-sm transition-all cta-btn"
                      style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)", color: "white" }}
                    >
                      Get started free -&gt;
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleCheckout(plan.monthlyPlanType!)}
                        className="w-full font-semibold py-3 rounded-xl text-sm transition-all cta-btn"
                        style={{ backgroundColor: "white", color: "#0d1f3c" }}
                      >
                        Go Pro monthly ($12/mo) -&gt;
                      </button>
                      <button
                        onClick={() => handleCheckout(plan.yearlyPlanType!)}
                        className="w-full font-semibold py-3 rounded-xl text-sm transition-all cta-btn"
                        style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.24)" }}
                      >
                        Go Pro yearly ($99/yr) -&gt;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 p-6 sm:p-7 bg-slate-50">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Why this structure works</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Free gives enough to see value, but not enough to stay free forever.</li>
              <li>$12/month is impulse-buy territory for active job seekers.</li>
              <li>$99/year works out to $8.25/month and rewards commitment.</li>
              <li>Annual billing improves cash flow and reduces churn.</li>
              <li>Two plans keeps decision-making simple: free or pro.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
