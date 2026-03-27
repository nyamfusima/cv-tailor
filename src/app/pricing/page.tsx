"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LandingPage() {
  const { user, signInWithGoogle } = useAuth();

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
        .step-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .step-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(13,31,60,0.12); }
      `}</style>

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-semibold text-white tracking-tight text-lg">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-white tracking-tight text-lg">tailor.ai</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/upload"
              className="cta-btn text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white"
            >
              Go to app →
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

      {/* HERO, FEATURES, HOW IT WORKS etc remain exactly the same */}
      {/* --- Skipped here for brevity since they are unchanged --- */}

      {/* Pricing */}
<section className="py-24 bg-white">
  <div className="max-w-5xl mx-auto px-4 sm:px-6">
    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3">Pricing</p>
    <h2
      style={{ fontFamily: "'DM Serif Display', serif" }}
      className="text-3xl sm:text-4xl text-slate-900 text-center mb-4"
    >
      Simple, transparent pricing
    </h2>
    <p className="text-slate-500 text-center text-base mb-14">
      Pay once. Credits never expire. Start free.
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[
        {
          name: "Starter Pack",
          price: "$5",
          desc: "Perfect for a single job search sprint.",
          credits: "5 tailor credits",
          pdfs: "5 PDF downloads",
          popular: false,
          param: "starter",
        },
        {
          name: "Growth Mode",
          price: "$20",
          desc: "For active job seekers applying to multiple roles.",
          credits: "20 tailor credits",
          pdfs: "20 PDF downloads",
          popular: true,
          param: "growth",
        },
        {
          name: "Unlimited",
          price: "$50",
          desc: "Apply to as many roles as you want. No limits.",
          credits: "Unlimited tailors",
          pdfs: "Unlimited PDFs",
          popular: false,
          param: "ninja",
        },
      ].map((plan) => (
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
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  color: plan.popular ? "white" : "#0d1f3c",
                }}
              >
                {plan.price}
              </span>
              <span
                className="text-sm mb-1.5"
                style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
              >
                one-off
              </span>
            </div>

            <p
              className="text-xs mb-6 leading-relaxed"
              style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
            >
              {plan.desc}
            </p>

<ul className="space-y-2.5 mb-8">
  {[
    { text: plan.credits, included: true },
    { text: plan.pdfs, included: true },
    { text: "ATS match score", included: true },
    { text: "Unlimited edits", included: true },
    { text: "Cover letter generator", included: false },
  ].map((f) => (
    <li key={f.text} className="flex items-center gap-3 text-sm">

      {f.included ? (
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: plan.popular ? "rgba(255,255,255,0.6)" : "#10b981" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 shrink-0"
          style={{ color: plan.popular ? "rgba(255,255,255,0.2)" : "#cbd5e1" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
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

            <button
              onClick={() => {
                if (!user) {
                  signInWithGoogle();
                } else {
                  window.location.href = `/api/checkout?type=${plan.param}`;
                }
              }}
              className="w-full font-semibold py-3 rounded-xl text-sm transition-all cta-btn"
              style={plan.popular ? {
                backgroundColor: "white",
                color: "#0d1f3c",
              } : {
                background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                color: "white",
              }}
            >
              Get {plan.name} →
            </button>
          </div>
        </div>
      ))}
    </div>

    <p className="text-center text-xs text-slate-400 mt-8">
      Every new account gets 3 free tailors to try first · Credits never expire
    </p>
  </div>
</section>

    </div>
  );
}