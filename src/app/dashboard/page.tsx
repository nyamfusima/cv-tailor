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
    const [{ data: ud }, { data: sessions }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase.from("tailor_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (ud) setUserData(ud);
    if (sessions) {
      setSessions(sessions);
      if (sessions.length > 0) {
        const avg = Math.round(
          sessions.reduce((sum: number, s: Session) => sum + (s.match_score || 0), 0) / sessions.length
        );
        setAvgScore(avg);
      }
    }
    setFetching(false);
  };

  const mimeFromName = (name: string): string => {
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

  const getJobTitle = (session: Session) => {
    const lines = session.job_description?.split("\n").filter(Boolean);
    return lines?.[0]?.slice(0, 60) || "Untitled Role";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: "#d1fae5", text: "#065f46" };
    if (score >= 60) return { bg: "#fef3c7", text: "#92400e" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || null;

  if (loading || fetching) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-400 text-sm">Loading your workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-0.5 shrink-0 cursor-pointer">
          <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">my</span>
          <img src="/favicon.ico" alt="myCVtailor" className="w-4 h-4 mx-0.5" />
          <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm hidden sm:inline">tailor.ai</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <span className="text-xs text-slate-400 hidden lg:block">{user?.email}</span>
          <div className="w-px h-4 bg-slate-200 hidden lg:block" />
          <Link
            href="/upload"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer hidden sm:block"
          >
            New tailor
          </Link>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── Page title ── */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl text-[#0d1f3c] mb-1.5"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {firstName ? `Welcome back, ${firstName}.` : "Your workspace."}
          </h1>
          <p className="text-sm text-slate-400">
            {sessions.length > 0
              ? `${sessions.length} tailored CV${sessions.length !== 1 ? "s" : ""} · avg ATS score ${avgScore}%`
              : "Get started by uploading your CV and tailoring it to a job."}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Master CV */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: userData?.master_cv_path ? "#eef2ff" : "#f1f5f9" }}
                  >
                    <svg
                      className="w-5 h-5 transition-colors"
                      style={{ color: userData?.master_cv_path ? "#0d1f3c" : "#94a3b8" }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Master CV</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {userData?.master_cv_name
                        ? userData.master_cv_name
                        : "Upload your base CV to reuse across applications"}
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
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
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

            {/* Tailored CVs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Tailored CVs</p>
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
                  <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">Upload a CV and a job description to create your first ATS-optimised application.</p>
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
                  {/* Desktop table header */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="col-span-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Job Position</p>
                    <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ATS Score</p>
                    <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Improvement</p>
                    <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</p>
                    <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</p>
                  </div>

                  {/* Desktop rows */}
                  <div className="divide-y divide-slate-50">
                    {sessions.map((session) => {
                      const scoreColor = getScoreColor(session.match_score);
                      const before = session.tailored_cv?.scoreBreakdown?.keywordsBefore || 0;
                      const improvement = session.match_score - before;
                      return (
                        <div
                          key={session.id}
                          className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center"
                        >
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-slate-800 truncate">{getJobTitle(session)}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{session.tailored_cv?.name}</p>
                          </div>
                          <div className="col-span-2">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}
                            >
                              {session.match_score}%
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-semibold text-emerald-600">
                              +{improvement}%
                            </span>
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
                      );
                    })}

                    {/* Mobile cards */}
                    {sessions.map((session) => {
                      const scoreColor = getScoreColor(session.match_score);
                      const before = session.tailored_cv?.scoreBreakdown?.keywordsBefore || 0;
                      const improvement = session.match_score - before;
                      return (
                        <div
                          key={`m-${session.id}`}
                          className="sm:hidden p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{getJobTitle(session)}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{session.tailored_cv?.name}</p>
                            </div>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}
                            >
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
                              className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
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
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="w-full lg:w-64 lg:shrink-0 space-y-4 lg:sticky lg:top-20">

            {/* Credits card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div
                className="px-5 py-5"
                style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Your credits
                </p>
                <p
                  className="text-4xl text-white leading-none mb-1"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {userData?.tailor_credits === 999999 ? "∞" : userData?.tailor_credits ?? 0}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>tailoring credits remaining</p>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-xs text-slate-500">Tailoring</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: (userData?.tailor_credits ?? 0) > 0 ? "#d1fae5" : "#fee2e2",
                      color: (userData?.tailor_credits ?? 0) > 0 ? "#065f46" : "#991b1b",
                    }}
                  >
                    {userData?.tailor_credits === 999999 ? "Unlimited" : `${userData?.tailor_credits ?? 0} left`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <p className="text-xs text-slate-500">PDF exports</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: (userData?.pdf_credits ?? 0) > 0 ? "#d1fae5" : "#fee2e2",
                      color: (userData?.pdf_credits ?? 0) > 0 ? "#065f46" : "#991b1b",
                    }}
                  >
                    {userData?.pdf_credits === 999999 ? "Unlimited" : `${userData?.pdf_credits ?? 0} left`}
                  </span>
                </div>

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
                  <p
                    className="text-4xl leading-none text-[#0d1f3c]"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
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

      {/* ── Session modal ── */}
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
                <p
                  className="text-white font-semibold text-sm sm:text-base leading-snug"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {selectedSession.tailored_cv?.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {getJobTitle(selectedSession)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 mt-0.5">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}
                >
                  {selectedSession.match_score}% ATS
                </span>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-white transition-opacity cursor-pointer"
                  style={{ opacity: 0.5 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                >
                  <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {[
                { id: "tailored", label: "Tailored CV" },
                { id: "original", label: "Original CV" },
                { id: "job", label: "Job Description" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSessionTab(tab.id as any)}
                  className="flex-1 py-3 px-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                  style={{
                    color: sessionTab === tab.id ? "#0d1f3c" : "#94a3b8",
                    borderBottom: sessionTab === tab.id ? "2px solid #0d1f3c" : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {sessionTab === "tailored" && selectedSession.tailored_cv && (
                <div className="space-y-5 text-sm text-slate-700">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <p className="font-bold text-slate-900 text-sm uppercase tracking-widest">
                      {selectedSession.tailored_cv.name}
                    </p>
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
                <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed font-sans break-words">
                  {selectedSession.cv_text}
                </pre>
              )}

              {sessionTab === "job" && (
                <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed font-sans break-words">
                  {selectedSession.job_description}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
