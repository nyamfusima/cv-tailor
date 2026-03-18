"use client";
import Link from "next/link";

export default function LandingPage() {
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
        <Link
          href="/upload"
          className="cta-btn text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl bg-white"
        >
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden pt-32 pb-32 px-4 sm:px-6 text-center"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 40%, #0f2d5e 70%, #0d1f3c 100%)",
        }}
      >
        <div className="absolute top-16 left-10 w-64 h-64 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white, transparent)" }} />
        <div className="absolute top-32 right-1/4 w-32 h-32 rounded-full opacity-5" style={{ background: "radial-gradient(circle, white, transparent)" }} />

        <div className="relative max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 border text-xs font-medium px-4 py-2 rounded-full mb-8"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white float"></span>
            AI-powered · ATS optimised · Free to use
          </div>

          <h1
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-5xl sm:text-6xl lg:text-7xl text-white leading-tight mb-6"
          >
            Your CV, tailored<br />to every job.
          </h1>

          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Upload your CV and paste a job description. Our AI rewrites your CV to match the role's exact keywords and pass ATS filters — in under 30 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/upload"
              className="cta-btn w-full sm:w-auto bg-white font-semibold px-8 py-4 rounded-2xl text-base"
              style={{ color: "#0d1f3c" }}
            >
              Tailor my CV for free →
            </Link>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              No sign up · No credit card · 100% private
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3">How it works</p>
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-3xl sm:text-4xl text-slate-900 text-center mb-16"
          >
            Three steps to your dream job
          </h2>

          {/* Timeline */}
          <div className="relative flex items-center justify-between mb-10 px-10 sm:px-20">
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px mx-16 sm:mx-28"
              style={{ background: "linear-gradient(90deg, #0d1f3c, #1a3a6b, #0d1f3c)" }}
            />
            {["01", "02", "03"].map((num, i) => (
              <div
                key={num}
                className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2"
                style={{
                  backgroundColor: i === 2 ? "#0d1f3c" : "white",
                  borderColor: "#0d1f3c",
                  color: i === 2 ? "white" : "#0d1f3c",
                }}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
                title: "Upload your resume",
                desc: "Easily import your existing CV in PDF or DOCX format.",
                image: "/images/step-upload.png",
                active: false,
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Paste the job description",
                desc: "Copy any job posting you're interested in and let our AI analyse it.",
                image: "/images/step-paste.png",
                active: false,
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Get an AI-tailored CV",
                desc: "Receive an optimised CV specifically tailored to match the job requirements.",
                image: "/images/step-result.png",
                active: true,
              },
            ].map((step) => (
              <div
                key={step.title}
                className="step-card rounded-2xl border overflow-hidden"
                style={{
                  borderColor: step.active ? "#0d1f3c" : "#e2e8f0",
                  borderWidth: step.active ? "2px" : "1px",
                  boxShadow: step.active ? "0 8px 32px rgba(13,31,60,0.12)" : undefined,
                }}
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                    >
                      {step.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>

                <div
                  className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-100"
                  style={{ backgroundColor: "#f8f9fc", minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                      const parent = img.parentElement!;
                      parent.innerHTML = `
                        <div style="text-align:center;padding:24px;">
                          <div style="width:40px;height:40px;border-radius:10px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
                            <svg width="20" height="20" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke-width="1.5"/><path d="M3 9h18" stroke-width="1.5"/></svg>
                          </div>
                          <p style="font-size:11px;color:#94a3b8;font-family:sans-serif;">Add screenshot here</p>
                        </div>`;
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/upload"
              className="cta-btn inline-block text-white font-semibold px-8 py-4 rounded-2xl text-sm"
              style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
            >
              Get started — it's free →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="py-20"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-4">What you get</p>
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-3xl sm:text-4xl text-slate-900 text-center mb-12"
          >
            Everything you need to get hired
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "ATS keyword injection",
                desc: "We scan the job description and rewrite your CV to mirror its exact language and keywords.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Match score breakdown",
                desc: "See a before/after score for keywords, skills, and experience relevance.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Harvard format PDF",
                desc: "Your tailored CV exports as a clean, professional Harvard-style PDF — ready to send.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Cover letter generator",
                desc: "Generate a matching cover letter in one click using your tailored CV and the job description.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                title: "Inline edit mode",
                desc: "Review and tweak any section of the tailored CV before downloading.",
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ),
                title: "Before / after compare",
                desc: "Toggle between your original and tailored CV to see exactly what changed.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="feature-card flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm"
              >
                <span
                  className="shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  {feature.icon}
                </span>
                <div>
                  <p className="font-semibold text-slate-800 mb-1">{feature.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl text-slate-900 mb-4"
          >
            Ready to land more interviews?
          </h2>
          <p className="text-slate-500 mb-8 text-base">Free to use. No account needed. Takes 30 seconds.</p>
          <Link
            href="/upload"
            className="cta-btn inline-block text-white font-semibold px-8 py-4 rounded-2xl text-base"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Tailor my CV now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center">
          <span className="text-sm text-slate-400">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-4 h-4" />
          <span className="text-sm text-slate-400">tailor.ai</span>
        </div>
        <p className="text-xs text-slate-400">Free to use · Your data is never stored</p>
      </footer>

    </div>
  );
}