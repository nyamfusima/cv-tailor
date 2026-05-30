"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface UserData {
  tailor_credits: number;
  pdf_credits: number;
  total_tailors_used: number;
  master_cv_path: string | null;
  master_cv_name: string | null;
}

interface Session {
  id: string;
  tailored_cv: any;
  match_score: number;
  created_at: string;
  job_description: string;
  cv_text: string;
}

// ── colour helpers ────────────────────────────────────────────────────────────
const scoreColor = (score: number) => {
  if (score >= 80) return { bg: "#d1fae5", text: "#065f46" };
  if (score >= 60) return { bg: "#fef3c7", text: "#92400e" };
  return { bg: "#fee2e2", text: "#991b1b" };
};

const getJobTitle = (session: Session) =>
  session.job_description?.split("\n").filter(Boolean)?.[0]?.slice(0, 55) || "Untitled Role";

// ── bento card configs ────────────────────────────────────────────────────────
const BENTO_FEATURES = [
  {
    id: "tailor",
    tag: "Most popular",
    title: "Tailor your CV",
    desc: "Paste a job description and get your CV rewritten to match — keywords, tone, and ATS structure.",
    href: "/upload",
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    span: "md:col-span-2",
    palette: {
      bg: "#E1F5EE", darkBg: "#085041",
      tagBg: "#9FE1CB", tagText: "#0F6E56",
      title: "#085041", body: "#0F6E56",
      arrowBg: "#1D9E75",
    },
    soon: false,
  },
  {
    id: "cover",
    tag: "New",
    title: "Cover letter",
    desc: "A sharp, tailored cover letter in seconds — personalised to the role and company.",
    href: "/cover-letter",
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    span: "md:col-span-1",
    palette: {
      bg: "#EEEDFE", darkBg: "#3C3489",
      tagBg: "#CECBF6", tagText: "#534AB7",
      title: "#26215C", body: "#534AB7",
      arrowBg: "#7F77DD",
    },
    soon: false,
  },
  {
    id: "match",
    tag: "Live jobs",
    title: "Job match",
    desc: "AI ranks real listings against your CV profile and surfaces the best-fit roles.",
    href: "/job-match",
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    span: "md:col-span-1",
    palette: {
      bg: "#FAEEDA", darkBg: "#633806",
      tagBg: "#FAC775", tagText: "#854F0B",
      title: "#412402", body: "#854F0B",
      arrowBg: "#BA7517",
    },
    soon: false,
  },
  {
    id: "interview",
    tag: "AI feature",
    title: "Voice interviewer",
    desc: "Practice with an AI interviewer trained on real questions for your target role.",
    href: "#",
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    span: "md:col-span-1",
    palette: {
      bg: "#FAECE7", darkBg: "#712B13",
      tagBg: "#F5C4B3", tagText: "#993C1D",
      title: "#4A1B0C", body: "#993C1D",
      arrowBg: "#D85A30",
    },
    soon: true,
  },
  {
    id: "autoapply",
    tag: "Automation",
    title: "Auto apply",
    desc: "Apply to matched roles automatically — your CV, your criteria, zero effort.",
    href: "#",
    icon: (
      <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    span: "md:col-span-1",
    palette: {
      bg: "#FBEAF0", darkBg: "#72243E",
      tagBg: "#F4C0D1", tagText: "#993556",
      title: "#4B1528", body: "#993556",
      arrowBg: "#D4537E",
    },
    soon: true,
  },
];

// ── component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionTab, setSessionTab] = useState<"tailored" | "original" | "job">("tailored");
  const [avgScore, setAvgScore] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    fetchAll();
  }, [user, loading]);

  const fetchAll = async () => {
    if (!user) return;
    setFetching(true);
    const [{ data: ud }, { data: sess }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("tailor_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (ud) setUserData(ud);
    if (sess) {
      setSessions(sess);
      if (sess.length > 0) {
        setAvgScore(Math.round(sess.reduce((s: number, r: Session) => s + (r.match_score || 0), 0) / sess.length));
      }
    }
    setFetching(false);
  };

  const mimeFromName = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/octet-stream";
  };

  const handleMasterCVUpload = async (file: File) => {
    if (!user) return;
    setUploadingCV(true);
    setUploadError(null);
    try {
      const path = `${user.id}/master-cv.${file.name.split(".").pop()}`;
      const { error: storageError } = await supabase.storage.from("master-cvs").upload(path, file, { upsert: true });
      if (storageError) throw storageError;
      await supabase.from("users").update({ master_cv_path: path, master_cv_name: file.name }).eq("id", user.id);
      await fetchAll();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadingCV(false);
    }
  };

  const handleDownloadMasterCV = async () => {
    if (!userData?.master_cv_path) return;
    const { data } = await supabase.storage.from("master-cvs").download(userData.master_cv_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = userData.master_cv_name || "master-cv";
      a.click();
    }
  };

  const handleUseMasterCV = async () => {
    if (!userData?.master_cv_path) return;
    const { data } = await supabase.storage.from("master-cvs").download(userData.master_cv_path);
    if (data) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        sessionStorage.setItem("masterCV", JSON.stringify({
          cvBase64: base64,
          cvName: userData.master_cv_name || "master-cv.pdf",
          cvType: mimeFromName(userData.master_cv_name || "master-cv.pdf"),
        }));
        router.push("/upload?useMaster=true");
      };
      reader.readAsDataURL(data);
    }
  };

  const handleRestoreSession = (session: Session) => {
    sessionStorage.setItem("tailoredCV", JSON.stringify(session.tailored_cv));
    router.push("/results");
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || null;
  const credits = userData?.tailor_credits ?? 0;
  const isUnlimited = credits === 999999;

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-slate-400 text-sm">Loading your workspace…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f3]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-0.5 shrink-0 cursor-pointer">
          <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">my</span>
          <img src="/favicon.ico" alt="myCVtailor" className="w-4 h-4 mx-0.5" />
          <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm hidden sm:inline">tailor.ai</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {/* Credits pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            style={{
              background: isUnlimited ? "#E1F5EE" : credits > 3 ? "#f0fdf4" : "#fef2f2",
              borderColor: isUnlimited ? "#9FE1CB" : credits > 3 ? "#bbf7d0" : "#fecaca",
              color: isUnlimited ? "#0F6E56" : credits > 3 ? "#15803d" : "#dc2626",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isUnlimited ? "#1D9E75" : credits > 3 ? "#22c55e" : "#ef4444" }}
            />
            {isUnlimited ? "Unlimited" : `${credits} credit${credits !== 1 ? "s" : ""}`}
          </div>

          <span className="text-xs text-slate-400 hidden lg:block">{user?.email}</span>
          <div className="w-px h-4 bg-slate-200 hidden lg:block" />

          <Link
            href="/pricing"
            className="text-xs font-semibold text-white px-3.5 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Buy credits
          </Link>
          <button
            onClick={async () => { await signOut(); router.push("/"); }}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium px-2 py-1.5 cursor-pointer"
          >
            Sign out
          </button>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── Welcome ────────────────────────────────────────────────────────── */}
        <div className="mb-7">
          <h1
            className="text-3xl sm:text-4xl text-[#0d1f3c] mb-1"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {firstName ? `Good morning, ${firstName}.` : "Your workspace."}
          </h1>
          <p className="text-sm text-slate-400">
            {sessions.length > 0
              ? `${sessions.length} tailored CV${sessions.length !== 1 ? "s" : ""} · avg ATS score ${avgScore}%`
              : "What are we working on today?"}
          </p>
        </div>

        {/* ── Bento grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {BENTO_FEATURES.map((f) => {
            const p = f.palette;
            const Wrapper = f.soon ? "div" : Link;
            const wrapperProps = f.soon ? {} : { href: f.href };

            return (
              <Wrapper
                key={f.id}
                {...(wrapperProps as any)}
                className={[
                  "relative rounded-2xl p-5 overflow-hidden border border-black/5 transition-all duration-200",
                  f.span,
                  f.soon
                    ? "opacity-60 cursor-default"
                    : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
                style={{ background: p.bg }}
              >
                {/* Coming soon badge */}
                {f.soon && (
                  <span
                    className="absolute top-3.5 right-3.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.07)", color: "rgba(0,0,0,0.4)" }}
                  >
                    Coming soon
                  </span>
                )}

                {/* Icon */}
                <div className="mb-3" style={{ color: p.body }}>{f.icon}</div>

                {/* Tag */}
                <span
                  className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2"
                  style={{ background: p.tagBg, color: p.tagText }}
                >
                  {f.tag}
                </span>

                {/* Text */}
                <h2
                  className="font-bold text-base mb-1.5 leading-snug"
                  style={{ fontFamily: "'DM Serif Display', serif", color: p.title }}
                >
                  {f.title}
                </h2>
                <p className="text-xs leading-relaxed pr-8" style={{ color: p.body }}>{f.desc}</p>

                {/* Arrow */}
                {!f.soon && (
                  <div
                    className="absolute bottom-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: p.arrowBg }}
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </div>
                )}
              </Wrapper>
            );
          })}
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "CVs tailored", value: sessions.length },
            { label: "Avg ATS score", value: sessions.length ? `${avgScore}%` : "—" },
            { label: "Credits left", value: isUnlimited ? "∞" : credits },
            { label: "PDF exports left", value: userData?.pdf_credits === 999999 ? "∞" : (userData?.pdf_credits ?? 0) },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-slate-100 px-4 py-4"
            >
              <p
                className="text-2xl font-bold text-[#0d1f3c] leading-none mb-1"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {s.value}
              </p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

          {/* ── Main column ──────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Master CV */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: userData?.master_cv_path ? "#eef2ff" : "#f1f5f9" }}
                  >
                    <svg
                      className="w-4.5 h-4.5 w-5 h-5"
                      style={{ color: userData?.master_cv_path ? "#4f46e5" : "#94a3b8" }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Master CV</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {userData?.master_cv_name ?? "Upload your base CV to reuse across applications"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {userData?.master_cv_path && (
                    <>
                      <button
                        onClick={handleDownloadMasterCV}
                        className="text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={handleUseMasterCV}
                        className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Use CV
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingCV}
                    className="text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadingCV ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    {userData?.master_cv_path ? "Replace" : "Upload CV"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleMasterCVUpload(e.target.files[0])}
                  />
                </div>
              </div>
              {uploadError && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</p>
                </div>
              )}
            </div>

            {/* Recent tailored CVs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Recent tailored CVs</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
                </div>
                <Link
                  href="/upload"
                  className="text-xs font-semibold text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New tailor
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">No tailored CVs yet</p>
                  <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
                    Upload a CV and paste a job description to create your first ATS-optimised application.
                  </p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                  >
                    Tailor my first CV
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Desktop header */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                    {["Job position", "ATS score", "Improvement", "Date", "Actions"].map((h, i) => (
                      <p key={h} className={`${i === 0 ? "col-span-4" : "col-span-2"} text-[10px] font-semibold text-slate-400 uppercase tracking-wider`}>{h}</p>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-50">
                    {sessions.map((session) => {
                      const sc = scoreColor(session.match_score);
                      const before = session.tailored_cv?.scoreBreakdown?.keywordsBefore || 0;
                      const improvement = session.match_score - before;

                      return (
                        <>
                          {/* Desktop row */}
                          <div
                            key={session.id}
                            className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center"
                          >
                            <div className="col-span-4">
                              <p className="text-sm font-medium text-slate-800 truncate">{getJobTitle(session)}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{session.tailored_cv?.name}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                {session.match_score}%
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs font-semibold text-emerald-600">+{improvement}%</span>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-slate-400">
                                {new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5">
                              <button
                                onClick={() => { setSelectedSession(session); setSessionTab("tailored"); }}
                                className="text-xs font-medium text-slate-500 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleRestoreSession(session)}
                                className="text-xs font-semibold text-white px-2 py-1 rounded-lg cursor-pointer transition-all hover:opacity-90"
                                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                              >
                                Open
                              </button>
                            </div>
                          </div>

                          {/* Mobile card */}
                          <div key={`m-${session.id}`} className="sm:hidden p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{getJobTitle(session)}</p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{session.tailored_cv?.name}</p>
                              </div>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                {session.match_score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs text-emerald-600 font-semibold">+{improvement}% improvement</p>
                              <p className="text-xs text-slate-400">
                                {new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedSession(session); setSessionTab("tailored"); }}
                                className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleRestoreSession(session)}
                                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
                                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                              >
                                Open →
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-60 lg:shrink-0 space-y-4 lg:sticky lg:top-20">

            {/* Credits card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-5" style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Your credits
                </p>
                <p className="text-4xl text-white leading-none mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {isUnlimited ? "∞" : credits}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>tailoring credits remaining</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { label: "Tailoring", val: credits, unlimited: isUnlimited },
                  { label: "PDF exports", val: userData?.pdf_credits ?? 0, unlimited: userData?.pdf_credits === 999999 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">{row.label}</p>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: row.unlimited || row.val > 0 ? "#d1fae5" : "#fee2e2",
                        color: row.unlimited || row.val > 0 ? "#065f46" : "#991b1b",
                      }}
                    >
                      {row.unlimited ? "Unlimited" : `${row.val} left`}
                    </span>
                  </div>
                ))}
                <div className="pt-1">
                  <Link
                    href="/pricing"
                    className="block w-full text-center text-xs font-semibold text-[#0d1f3c] py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Get more credits →
                  </Link>
                </div>
              </div>
            </div>

            {/* ATS score */}
            {sessions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Avg ATS score</p>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-4xl leading-none text-[#0d1f3c]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {avgScore}%
                  </p>
                  <p className="text-xs text-slate-400 mb-0.5">across {sessions.length} CV{sessions.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${avgScore}%`, background: "linear-gradient(90deg, #0d1f3c, #1a3a6b)" }}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Session modal ─────────────────────────────────────────────────────── */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-4 shrink-0"
              style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" }}
            >
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm sm:text-base leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {selectedSession.tailored_cv?.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {getJobTitle(selectedSession)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 mt-0.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}>
                  {selectedSession.match_score}% ATS
                </span>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="cursor-pointer transition-opacity"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "white")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {(["tailored", "original", "job"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSessionTab(tab)}
                  className="flex-1 py-3 px-3 text-xs font-semibold transition-all cursor-pointer capitalize whitespace-nowrap"
                  style={{
                    color: sessionTab === tab ? "#0d1f3c" : "#94a3b8",
                    borderBottom: sessionTab === tab ? "2px solid #0d1f3c" : "2px solid transparent",
                  }}
                >
                  {tab === "tailored" ? "Tailored CV" : tab === "original" ? "Original CV" : "Job Description"}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {sessionTab === "tailored" && selectedSession.tailored_cv && (
                <div className="space-y-5 text-sm text-slate-700">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <p className="font-bold text-slate-900 text-sm uppercase tracking-widest">{selectedSession.tailored_cv.name}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {[selectedSession.tailored_cv.email, selectedSession.tailored_cv.phone, selectedSession.tailored_cv.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {selectedSession.tailored_cv.summary && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Summary</p>
                      <p className="text-sm leading-relaxed text-slate-600">{selectedSession.tailored_cv.summary}</p>
                    </div>
                  )}
                  {selectedSession.tailored_cv.skills?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills</p>
                      {selectedSession.tailored_cv.skills.map((g: any, i: number) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:gap-2 text-sm mb-1.5">
                          <span className="font-semibold text-slate-800 shrink-0">{g.category}:</span>
                          <span className="text-slate-500">{g.skills.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedSession.tailored_cv.experience?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</p>
                      {selectedSession.tailored_cv.experience.map((job: any, i: number) => (
                        <div key={i} className="mb-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <p className="font-semibold text-slate-900">{job.title}</p>
                            <p className="text-xs text-slate-400">{job.dates}</p>
                          </div>
                          <p className="text-xs text-slate-500 italic mb-1.5">{job.company}</p>
                          {job.bullets?.map((b: string, j: number) => (
                            <p key={j} className="text-xs text-slate-600 flex gap-1.5 mb-0.5">
                              <span className="text-slate-300 shrink-0">—</span><span>{b}</span>
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {sessionTab === "original" && (
                <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed font-sans break-words">{selectedSession.cv_text}</pre>
              )}
              {sessionTab === "job" && (
                <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed font-sans break-words">{selectedSession.job_description}</pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}