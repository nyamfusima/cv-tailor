"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const plans = [
  {
    id: "starter",
    name: "Starter Pack",
    price: "$5",
    billing: "One-off",
    description: "Perfect for a single job search sprint.",
    popular: false,
    variantParam: "starter",
    features: [
      { text: "5 tailor credits", included: true },
      { text: "5 PDF downloads", included: true },
      { text: "ATS match score", included: true },
      { text: "Unlimited edits", included: true },
      { text: "Cover letter generator", included: true },
      { text: "AI Bullet Rewrite", included: false, soon: true },
      { text: "Page Fit", included: false, soon: true },
    ],
    cta: "Get Starter",
  },
  {
    id: "growth",
    name: "Growth Mode",
    price: "$20",
    billing: "One-off",
    description: "For active job seekers applying to multiple roles.",
    popular: true,
    variantParam: "growth",
    features: [
      { text: "20 tailor credits", included: true },
      { text: "20 PDF downloads", included: true },
      { text: "ATS match score", included: true },
      { text: "Unlimited edits", included: true },
      { text: "Cover letter generator", included: true },
      { text: "AI Bullet Rewrite", included: false, soon: true },
      { text: "Page Fit", included: false, soon: true },
    ],
    cta: "Get Growth Mode",
  },
  {
    id: "ninja",
    name: "Unlimited",
    price: "$50",
    billing: "One-off",
    description: "Apply to as many roles as you want. No limits.",
    popular: false,
    variantParam: "ninja",
    features: [
      { text: "Unlimited tailor credits", included: true },
      { text: "Unlimited PDF downloads", included: true },
      { text: "ATS match score", included: true },
      { text: "Unlimited edits", included: true },
      { text: "Cover letter generator", included: true },
      { text: "AI Bullet Rewrite", included: false, soon: true },
      { text: "Page Fit", included: false, soon: true },
    ],
    cta: "Get Unlimited",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const handleCheckout = async (variantParam: string) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    router.push(`/api/checkout?type=${variantParam}`);
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.ai</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/account"
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
            >
              Account
            </Link>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-400 transition-colors"
            >
              Sign in
            </button>
          )}
          <Link
            href="/upload"
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">

        {/* Heading */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Pricing</p>
          <h1
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl text-slate-900 mb-4"
          >
            Simple, transparent pricing
          </h1>
          <p className="text-slate-500 text-base">
            Pay once. Credits never expire. Start with 3 free tailors.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: plan.popular ? "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" : "white",
                border: plan.popular ? "none" : "1px solid #e2e8f0",
                boxShadow: plan.popular ? "0 20px 60px rgba(13,31,60,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
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

                <div className="flex items-end gap-1 mb-1">
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
                    {plan.billing}
                  </span>
                </div>

                <p
                  className="text-xs mb-6 leading-relaxed"
                  style={{ color: plan.popular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                >
                  {plan.description}
                </p>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm">
                      {f.included ? (
                        <svg
                          className="w-4 h-4 shrink-0"
                          style={{ color: plan.popular ? "rgba(255,255,255,0.6)" : "#10b981" }}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 shrink-0"
                          style={{ color: plan.popular ? "rgba(255,255,255,0.2)" : "#cbd5e1" }}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span
                        style={{
                          color: f.included
                            ? plan.popular ? "rgba(255,255,255,0.85)" : "#374151"
                            : plan.popular ? "rgba(255,255,255,0.3)" : "#cbd5e1",
                        }}
                      >
                        {f.text}
                        {f.soon && (
                          <span
                            className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: plan.popular ? "rgba(255,255,255,0.1)" : "#f1f5f9",
                              color: plan.popular ? "rgba(255,255,255,0.4)" : "#94a3b8",
                            }}
                          >
                            Soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.variantParam)}
                  className="w-full font-semibold py-3 rounded-xl text-sm transition-all"
                  style={plan.popular ? {
                    backgroundColor: "white",
                    color: "#0d1f3c",
                  } : {
                    background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                    color: "white",
                  }}
                >
                  {plan.cta} →
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mb-16">
          Every new account gets 3 free tailors · Credits never expire · No subscriptions
        </p>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-8">FAQ</p>
          <div className="space-y-5">
            {[
              {
                q: "What is a tailor credit?",
                a: "Each time you upload a CV and tailor it to a job description uses one tailor credit.",
              },
              {
                q: "Do credits expire?",
                a: "No — your credits never expire. Use them whenever you need them.",
              },
              {
                q: "What happens on the Unlimited plan?",
                a: "You get unlimited tailors and PDF downloads — no caps, no resets, ever.",
              },
              {
                q: "What counts as a PDF download?",
                a: "Each time you download your tailored CV as a PDF uses one download credit. Unlimited plan has no cap.",
              },
              {
                q: "Is my CV data stored?",
                a: "No. Your CV and job description are processed in real time and never stored on our servers.",
              },
              {
                q: "Can I try before I buy?",
                a: "Yes — every new account gets 3 free tailors to try before purchasing.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-slate-100 pb-5">
                <p className="font-semibold text-slate-800 text-sm mb-1.5">{item.q}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 mt-8">
        <div className="flex items-center">
          <span className="text-sm text-slate-400">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-4 h-4" />
          <span className="text-sm text-slate-400">tailor.ai</span>
        </div>
        <p className="text-xs text-slate-400">Pay once · No subscriptions · Your data is never stored</p>
      </footer>

    </div>
  );
}