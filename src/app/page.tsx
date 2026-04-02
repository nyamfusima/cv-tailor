"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { TestimonialsColumn, testimonials } from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";

/* ─── Count-up number hook ─── */
function useCountUp(to: number, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * to));
      if (p < 1) requestAnimationFrame(step);
      else setCount(to);
    };
    requestAnimationFrame(step);
  }, [start, to, duration]);
  return count;
}

function StatNumber({ to, suffix, start }: { to: number; suffix: string; start: boolean }) {
  const count = useCountUp(to, 1400, start);
  return <>{count}{suffix}</>;
}

/* ─── Scroll-triggered animation hook ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function LandingPage() {
  const { user, signInWithGoogle, signInWithEmailLink, signInWithPassword, signUp, resetPassword, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { if (user) router.push("/upload"); }, [user, router]);
  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hero     = useInView(0.05);
  const steps    = useInView(0.08);
  const features = useInView(0.08);
  const pricing  = useInView(0.08);
  const cta      = useInView(0.08);

  const openSignup = () => { setAuthMode("signup"); setAuthOpen(true); };
  const openSignin = () => { setAuthMode("signin"); setAuthOpen(true); };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideRight { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
        @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes shimmer  { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(13,31,60,0.15);} 50%{box-shadow:0 0 40px rgba(13,31,60,0.30);} }
        @keyframes orb      { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20px,-15px) scale(1.06);} }

        .anim-up    { animation: fadeUp    0.6s ease both; }
        .anim-in    { animation: fadeIn    0.6s ease both; }
        .anim-right { animation: slideRight 0.6s ease both; }
        .float      { animation: float     4s ease-in-out infinite; }

        .d0  { animation-delay:0s;    }
        .d1  { animation-delay:0.08s; }
        .d2  { animation-delay:0.16s; }
        .d3  { animation-delay:0.24s; }
        .d4  { animation-delay:0.32s; }
        .d5  { animation-delay:0.40s; }
        .d6  { animation-delay:0.48s; }

        @keyframes lightning-sweep {
          0%   { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
          5%   { opacity: 1; }
          40%  { transform: translateX(120%) skewX(-15deg); opacity: 0; }
          100% { transform: translateX(120%) skewX(-15deg); opacity: 0; }
        }
        .lightning-btn { position: relative; overflow: hidden; }
        .lightning-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%);
          animation: lightning-sweep 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        .card-hover { transition: transform 0.22s ease, box-shadow 0.22s ease; cursor:pointer; }
        .card-hover:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(13,31,60,0.11); }

        .btn-primary {
          background: linear-gradient(135deg,#0d1f3c,#1a3a6b);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(13,31,60,0.28); }

        .btn-white  { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .btn-white:hover  { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.12); }

        .nav-glass {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(13,31,60,0.07);
          box-shadow: 0 2px 20px rgba(13,31,60,0.06);
        }
        .nav-clear { background: transparent; }

        .hero-grad {
          background-color: #0a1628;
          background-image: linear-gradient(135deg,#0a1628 0%,#0d1f3c 40%,#1a3a6b 75%,#0f2d5e 100%);
        }
        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px),
            linear-gradient(135deg,#0a1628 0%,#0d1f3c 40%,#1a3a6b 75%,#0f2d5e 100%);
          background-size:56px 56px, 56px 56px, cover;
        }
        .step-img { transition: transform 0.3s ease; }
        .step-img:hover { transform: scale(1.02); }

        .badge-dot { animation: pulse-dot 2s ease-in-out infinite; }

        .pricing-popular-glow { animation: glow 3s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ──────────── NAV ──────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "nav-glass" : "nav-clear"}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <span className={`font-bold text-base tracking-tight transition-colors duration-300 mr-1 ${scrolled ? "text-slate-900" : "text-white"}`}>my</span>
            <img src="/favicon.ico" alt="" className="w-4 h-4" />
            <span className={`font-bold text-base tracking-tight transition-colors duration-300 ${scrolled ? "text-slate-900" : "text-white"}`}>tailor.ai</span>
          </div>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-7">
            {["Features", "How it works", "Pricing"].map((label) => (
              <a key={label}
                href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                className={`text-sm font-medium transition-colors duration-200 cursor-pointer ${scrolled ? "text-slate-600 hover:text-slate-900" : "text-white hover:text-white"}`}>
                {label}
              </a>
            ))}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/upload"
                  className="btn-primary cursor-pointer text-white text-sm font-semibold px-4 py-2 rounded-xl">
                  Go to app →
                </Link>
                <button onClick={signOut}
                  className={`hidden sm:block text-xs font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${scrolled ? "text-slate-500 border border-slate-200 hover:bg-slate-50" : "text-white/70 border border-white/20 hover:text-white"}`}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={openSignin}
                  className={`hidden sm:block text-sm font-medium px-4 py-2 rounded-xl border transition-colors cursor-pointer ${scrolled ? "text-slate-600 hover:text-slate-900 border-[#1a3a6b]" : "text-white hover:text-white border-[#1a3a6b]"}`}>
                  Sign in
                </button>
                <button onClick={openSignup}
                  className={`btn-primary cursor-pointer text-sm font-semibold px-4 py-2 rounded-xl text-white`}>
                  Get started free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ──────────── HERO ──────────── */}
      <section id="how-it-works" className="hero-grad relative overflow-hidden pt-24 pb-0 min-h-[88vh] flex flex-col">
        {/* Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background:"radial-gradient(circle,#4a90d9,transparent 65%)", animation:"orb 18s ease-in-out infinite" }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background:"radial-gradient(circle,#93c5fd,transparent 65%)", animation:"orb 14s ease-in-out infinite reverse" }} />
        </div>

        <div ref={hero.ref} className="relative max-w-7xl mx-auto px-5 sm:px-8 flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-16 lg:py-20">
          {/* LEFT — copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full mb-7 border ${mounted ? "anim-up d0" : "opacity-0"}`}
              style={{ backgroundColor:"rgba(255,255,255,0.1)", borderColor:"rgba(255,255,255,0.22)", color:"rgba(255,255,255,0.92)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 badge-dot" />
              Your first 3 tailors are free — no card needed
            </div>

            {/* Headline */}
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-5 ${mounted ? "anim-up d1" : "opacity-0"}`}>
              Tailor your CV to<br />
              <span style={{ background:"linear-gradient(90deg,#7dd3fc,#93c5fd,#c4b5fd)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                every job in 30 seconds.
              </span>
            </h1>

            {/* Sub */}
            <p className={`text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 ${mounted ? "anim-up d2" : "opacity-0"}`}
              style={{ color:"rgba(255,255,255,0.78)" }}>
              Upload your CV and paste a job description. Our AI rewrites it to match the role&apos;s exact keywords and pass ATS filters instantly.
            </p>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-10 ${mounted ? "anim-up d3" : "opacity-0"}`}>
              <button onClick={openSignup}
                className="btn-white lightning-btn cursor-pointer w-full sm:w-auto bg-white font-bold px-8 py-4 rounded-2xl text-base flex items-center justify-center gap-2.5"
                style={{ color:"#0d1f3c" }}>
                Get my free AI-tailored CV
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            </div>

            {/* Stats */}
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 justify-center lg:justify-start ${mounted ? "anim-up d4" : "opacity-0"}`}>
              {[
                { value: null, to: 500, suffix: "+", label: "CVs tailored" },
                { value: "~60s", to: null, suffix: "", label: "Average time" },
                { value: "3",    to: null, suffix: "", label: "Free tailors" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">
                    {s.to !== null
                      ? <StatNumber to={s.to} suffix={s.suffix} start={hero.visible} />
                      : s.value}
                  </span>
                  <span className="text-sm" style={{ color:"rgba(255,255,255,0.7)" }}>{s.label}</span>
                </div>
              ))}
              <div className="w-px h-4 bg-white/20 hidden sm:block" />
              {/* Avatar cluster — job seekers joined */}
              <div className="flex items-center gap-0 pr-1">
                <div className="flex -space-x-1.5 mr-2">
                  {[
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
                  ].map((src, i) => (
                    <img key={i} src={src} width={22} height={22} alt=""
                      className="rounded-full object-cover"
                      style={{ width:22, height:22, outline:"2px solid rgba(255,255,255,0.2)" }} />
                  ))}
                </div>
                <p className="text-xs" style={{ color:"rgba(255,255,255,0.85)" }}>
                  <strong className="font-semibold text-white">+200</strong> job seekers joined this week
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — product screenshot */}
          <div className={`flex-1 w-full max-w-xl lg:max-w-none ${mounted ? "anim-right d2" : "opacity-0"}`}>
            <div className="relative">
              {/* Browser chrome mockup */}
              <div className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}>
                {/* Browser bar */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor:"rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.2)" }}>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                  <div className="flex-1 mx-3 h-5 rounded-full flex items-center px-3" style={{ background:"rgba(255,255,255,0.07)" }}>
                    <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.55)" }}>mycvtailor.co.za/results</span>
                  </div>
                </div>
                {/* Screenshot */}
                <img
                  src="/images/step-result.png"
                  alt="AI-tailored CV result"
                  className="w-full block float"
                  style={{ maxHeight:"420px", objectFit:"cover", objectPosition:"top" }}
                />
              </div>
              {/* Floating badge */}
              <div className="hidden sm:flex absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 items-center gap-2.5"
                style={{ border:"1px solid #e2e8f0" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"linear-gradient(135deg,#0d1f3c,#1a3a6b)" }}>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">ATS Score improved</p>
                  <p className="text-xs text-slate-500">Keywords matched ↑</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="relative w-full" style={{ marginBottom:"-2px" }}>
          <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 72L60 62C120 52 240 32 360 26C480 20 600 28 720 34C840 40 960 42 1080 36C1200 30 1320 14 1380 8L1440 2V72H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ──────────── HOW IT WORKS ──────────── */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div ref={steps.ref} className="max-w-6xl mx-auto px-5 sm:px-8">
          <p className={`text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3 ${steps.visible ? "anim-up d0" : "opacity-0"}`}>
            How it works
          </p>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center mb-4 ${steps.visible ? "anim-up d1" : "opacity-0"}`}>
            Three steps to your dream job
          </h2>
          <p className={`text-slate-500 text-center text-base mb-16 max-w-xl mx-auto ${steps.visible ? "anim-up d2" : "opacity-0"}`}>
            No complex setup. Just upload, paste, and download.
          </p>

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
            ].map((step, i) => (
              <div
                key={step.title}
                className={`step-card rounded-2xl border overflow-hidden ${steps.visible ? `anim-up d${i + 3}` : "opacity-0"}`}
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

          <div className={`text-center mt-12 ${steps.visible ? "anim-up d6" : "opacity-0"}`}>
            <button
              onClick={openSignup}
              className="btn-primary cursor-pointer inline-block text-white font-semibold px-8 py-4 rounded-2xl text-sm"
            >
              Get started now →
            </button>
          </div>
        </div>
      </section>

      {/* ──────────── FEATURES ──────────── */}
      <section id="features-section" className="py-14 sm:py-20" style={{ background:"linear-gradient(180deg,#f8faff 0%,#eef3ff 100%)" }}>
        <div ref={features.ref} className="max-w-5xl mx-auto px-5 sm:px-8">
          <p className={`text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3 ${features.visible ? "anim-up d0" : "opacity-0"}`}>
            What you get
          </p>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center mb-12 ${features.visible ? "anim-up d1" : "opacity-0"}`}>
            Everything you need to get hired
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                title:"ATS keyword injection", desc:"Rewrites your CV to mirror the job description's exact language so you pass automated filters." },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                title:"Match score breakdown", desc:"See a before/after score for keywords, skills, and experience relevance." },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                title:"Harvard format PDF", desc:"Exports as a clean, professional Harvard-style PDF — ready to send directly." },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                title:"Cover letter generator", desc:"One-click matching cover letter using your tailored CV and the job description." },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
                title:"Inline edit mode", desc:"Review and tweak any section of the tailored CV before downloading." },
              { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
                title:"Before / after compare", desc:"Toggle between your original and tailored CV to see exactly what changed." },
            ].map((f, i) => (
              <div key={f.title}
                className={`card-hover flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm ${features.visible ? `anim-up d${Math.min(i + 2, 6)}` : "opacity-0"}`}>
                <span className="shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background:"linear-gradient(135deg,#0d1f3c,#1a3a6b)" }}>
                  {f.icon}
                </span>
                <div>
                  <p className="font-semibold text-slate-800 mb-1 text-sm">{f.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── TESTIMONIALS ──────────── */}
      <section className="py-16 sm:py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-10"
          >
            <div className="flex justify-center">
              <div className="border border-slate-200 bg-white py-1 px-4 rounded-lg text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Testimonials
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-5 text-center">
              What our users say
            </h2>
            <p className="text-center mt-4 text-slate-500 text-base">
              Join thousands of job seekers who landed interviews with CV Tailor.
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[680px] overflow-hidden">
            <TestimonialsColumn testimonials={testimonials.slice(0, 3)} duration={15} />
            <TestimonialsColumn testimonials={testimonials.slice(3, 6)} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={testimonials.slice(6, 9)} className="hidden lg:block" duration={17} />
          </div>
        </div>
      </section>

      {/* ---- PRICING ---- */}
      <section id="pricing" className="bg-white py-16 sm:py-24">
        <div ref={pricing.ref} className="max-w-5xl mx-auto px-5 sm:px-8">
          {/* Header */}
          <div className="flex justify-center mb-5">
            <div className={`border border-slate-200 bg-white py-1 px-4 rounded-lg text-xs font-semibold text-slate-500 uppercase tracking-widest ${pricing.visible ? "anim-up d0" : "opacity-0"}`}>
              Pricing
            </div>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-center mb-3 ${pricing.visible ? "anim-up d1" : "opacity-0"}`}>
            Simple, transparent pricing
          </h2>
          <p className={`text-slate-500 text-center text-base mb-14 ${pricing.visible ? "anim-up d2" : "opacity-0"}`}>
            Pay once. Credits never expire. Start free.
          </p>

          {/* Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch ${pricing.visible ? "anim-up d3" : "opacity-0"}`}>

            {/* Starter Pack */}
            <div className="card-hover flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Starter Pack</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-bold tracking-tight text-slate-900">$5</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">once-off</p>
              <p className="text-sm text-slate-500 mb-8">Perfect for a single job search sprint.</p>
              <ul className="space-y-3 mb-10 flex-1">
                {["5 tailor credits","5 PDF downloads","ATS match score","Unlimited edits"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#0d1f3c,#1a3a6b)" }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </span>
                    {item}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-slate-400">
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                  </span>
                  <span className="line-through">Cover letter generator</span>
                </li>
              </ul>
              <button onClick={openSignup} className="w-full btn-primary cursor-pointer text-white font-semibold py-3 rounded-xl text-sm">
                Get Starter Pack →
              </button>
            </div>

            {/* Growth Mode — Most Popular */}
            <div className="card-hover pricing-popular-glow flex flex-col rounded-2xl border-2 p-8 relative mt-6 md:mt-0" style={{ borderColor:"#0d1f3c", background:"linear-gradient(160deg,#0d1f3c 0%,#1a3a6b 100%)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-[#0d1f3c] text-xs font-bold px-4 py-1 rounded-full shadow-md border border-slate-200 whitespace-nowrap">
                Most popular
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 mb-4">Growth Mode</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-bold tracking-tight text-white">$20</span>
              </div>
              <p className="text-xs text-white/50 mb-6">once-off</p>
              <p className="text-sm text-white/70 mb-8">For active job seekers applying to multiple roles.</p>
              <ul className="space-y-3 mb-10 flex-1">
                {["20 tailor credits","20 PDF downloads","ATS match score","Unlimited edits","Cover letter generator"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/90">
                    <span className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={openSignup} className="w-full cursor-pointer bg-white font-bold py-3 rounded-xl text-sm transition hover:bg-slate-100" style={{ color:"#0d1f3c" }}>
                Get Growth Mode →
              </button>
            </div>

            {/* Unlimited */}
            <div className="card-hover flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Unlimited</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-bold tracking-tight text-slate-900">$50</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">once-off</p>
              <p className="text-sm text-slate-500 mb-8">Apply to as many roles as you want. No limits.</p>
              <ul className="space-y-3 mb-10 flex-1">
                {["Unlimited tailors","Unlimited PDFs","ATS match score","Unlimited edits","Cover letter generator"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#0d1f3c,#1a3a6b)" }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={openSignup} className="w-full btn-primary cursor-pointer text-white font-semibold py-3 rounded-xl text-sm">
                Get Unlimited →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────── FINAL CTA ──────────── */}
      <section className="py-16 sm:py-24 hero-grad relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-[0.06]"
            style={{ background:"radial-gradient(circle,#60a5fa,transparent 65%)", animation:"orb 14s ease-in-out infinite" }} />
        </div>
        <div ref={cta.ref} className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <h2 className={`text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight ${cta.visible ? "anim-up d0" : "opacity-0"}`}>
            Ready to land more interviews?
          </h2>
          <p className={`text-base mb-10 ${cta.visible ? "anim-up d1" : "opacity-0"}`}
            style={{ color:"rgba(255,255,255,0.78)" }}>
            Join 200+ job seekers using myCVtailor.ai. Get 3 free tailors when you sign up.
          </p>
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 ${cta.visible ? "anim-up d2" : "opacity-0"}`}>
            <button onClick={openSignup}
              className="btn-white cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white font-bold px-8 py-4 rounded-2xl text-base"
              style={{ color:"#0d1f3c" }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={openSignup}
              className="w-full sm:w-auto text-sm font-medium px-7 py-4 rounded-2xl cursor-pointer transition-all"
              style={{ color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.3)" }}>
              Sign up with email
            </button>
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="bg-white border-t border-slate-100 px-5 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-slate-600">my</span>
            <img src="/favicon.ico" alt="myCVtailor.ai" className="w-4 h-4" />
            <span className="text-sm font-semibold text-slate-600">tailor.ai</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link href="/terms"   className="hover:text-slate-800 transition-colors cursor-pointer">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-800 transition-colors cursor-pointer">Privacy</Link>
            <Link href="/refunds" className="hover:text-slate-800 transition-colors cursor-pointer">Refunds</Link>
          </div>
        </div>
      </footer>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          mode={authMode}
          setMode={setAuthMode}
          signInWithGoogle={signInWithGoogle}
          signInWithEmailLink={signInWithEmailLink}
          signInWithPassword={signInWithPassword}
          signUp={signUp}
          resetPassword={resetPassword}
          onSignedIn={() => router.push("/upload")}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────── */
function AuthModal({
  onClose, mode, setMode, signInWithGoogle, signInWithEmailLink, signInWithPassword, signUp, resetPassword, onSignedIn,
}: {
  onClose: () => void;
  mode: "signin" | "signup";
  setMode: (m: "signin" | "signup") => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  onSignedIn: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true); setError(""); setMessage("");
    try { await fn(); }
    catch (err: any) { setError(err?.message || "Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const handleSignIn    = () => run(async () => { await signInWithPassword(email, password); onSignedIn(); });
  const handleSignUp    = () => run(() => signUp(email, password, name || undefined));
  const handleMagicLink = () => run(async () => { await signInWithEmailLink(email); setMessage("Magic link sent. Check your inbox."); });
  const handleReset     = () => run(async () => { await resetPassword(email); setMessage("Password reset link sent. Check your email."); });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor:"rgba(10,22,40,0.72)", backdropFilter:"blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative" style={{ animation:"fadeUp 0.3s ease both" }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-slate-400 hover:bg-slate-100 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          {showReset ? "Reset password" : mode === "signin" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {showReset ? "Enter your email to receive a reset link." : mode === "signup" ? "Get 3 free CV tailors when you sign up — no card needed." : "Sign in to access your tailored CVs."}
        </p>

        {!showReset && (
          <button onClick={() => run(signInWithGoogle)}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}

        {!showReset && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">or continue with email</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
        )}

        <div className="space-y-3">
          {mode === "signup" && !showReset && (
            <div>
              <label htmlFor="modal-name" className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
              <input id="modal-name" type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
            </div>
          )}
          <div>
            <label htmlFor="modal-email" className="block text-xs font-medium text-slate-600 mb-1">Email address</label>
            <input id="modal-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
          </div>
          {!showReset && (
            <div>
              <label htmlFor="modal-password" className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input id="modal-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
            </div>
          )}
        </div>

        {error   && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {message && <p className="mt-3 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{message}</p>}

        <button
          onClick={showReset ? handleReset : mode === "signin" ? handleSignIn : handleSignUp}
          disabled={loading}
          className="mt-4 w-full text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-60"
          style={{ background:"linear-gradient(135deg,#0d1f3c,#1a3a6b)" }}>
          {loading ? "Please wait…" : showReset ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account — it's free"}
        </button>

        {!showReset && (
          <button onClick={() => run(handleMagicLink)} disabled={loading}
            className="mt-2 w-full text-slate-500 text-sm py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
            Send magic link instead
          </button>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          {!showReset ? (
            <>
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="hover:text-slate-700 cursor-pointer transition-colors">
                {mode === "signin" ? "No account? Sign up free" : "Already have an account? Sign in"}
              </button>
              {mode === "signin" && (
                <button onClick={() => setShowReset(true)} className="hover:text-slate-700 cursor-pointer transition-colors">Forgot password?</button>
              )}
            </>
          ) : (
            <button onClick={() => setShowReset(false)} className="hover:text-slate-700 cursor-pointer transition-colors">← Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
