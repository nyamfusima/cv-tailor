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
      supabase
        .from("tailor_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
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

  const handleMasterCVUpload = async (file: File) => {
    if (!user) return;
    setUploadingCV(true);

    try {
      const path = `${user.id}/master-cv.${file.name.split(".").pop()}`;

      const { error: uploadError } = await supabase.storage
        .from("master-cvs")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from("users").update({
        master_cv_path: path,
        master_cv_name: file.name,
      }).eq("id", user.id);

      await fetchAll();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingCV(false);
    }
  };

  const handleDownloadMasterCV = async () => {
    if (!userData?.master_cv_path) return;
    const { data } = await supabase.storage
      .from("master-cvs")
      .download(userData.master_cv_path);
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
    const { data } = await supabase.storage
      .from("master-cvs")
      .download(userData.master_cv_path);
    if (data) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        sessionStorage.setItem("masterCV", JSON.stringify({
          cvBase64: base64,
          cvName: userData.master_cv_name || "master-cv.pdf",
          cvType: data.type,
        }));
        router.push("/upload?useMaster=true");
      };
      reader.readAsDataURL(data);
    }
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

  if (loading || fetching) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <svg className="animate-spin w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-400 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.ai</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 hidden sm:block">{user?.email}</span>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Buy credits →
          </Link>
          <button
            onClick={async () => { await signOut(); router.push("/"); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6 items-start">

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Welcome */}
            <div>
              <h1
                style={{ fontFamily: "'DM Serif Display', serif" }}
                className="text-3xl text-slate-900 mb-1"
              >
                Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""} 👋
              </h1>
              <p className="text-sm text-slate-400">Here's your CV tailoring history and tools.</p>
            </div>

            {/* Master CV */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: userData?.master_cv_path ? "#f0f4ff" : "#f8f9fc" }}
                  >
                    <svg className="w-6 h-6" style={{ color: userData?.master_cv_path ? "#0d1f3c" : "#cbd5e1" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Master CV</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {userData?.master_cv_name
                        ? `${userData.master_cv_name} · Stored`
                        : "Upload your base CV — reuse it for every application"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {userData?.master_cv_path && (
                    <>
                      <button
                        onClick={handleDownloadMasterCV}
                        className="text-xs font-medium text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:border-slate-400 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={handleUseMasterCV}
                        className="text-xs font-semibold text-white px-3 py-2 rounded-xl flex items-center gap-1.5"
                        style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Use this CV
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingCV}
                    className="text-xs font-medium text-slate-500 border border-slate-200 px-3 py-2 rounded-xl hover:border-slate-400 transition-all flex items-center gap-1.5"
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
            </div>

            {/* Tailored CVs history */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Tailored CVs</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sessions.length} sessions total</p>
                </div>
                <Link
                  href="/upload"
                  className="text-xs font-semibold text-white px-4 py-2 rounded-xl flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New tailor
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mb-1">No tailored CVs yet</p>
                  <p className="text-xs text-slate-400 mb-5">Create your first tailored CV to get started</p>
                  <Link
                    href="/upload"
                    className="inline-block text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                    style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                  >
                    Tailor my first CV →
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="col-span-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Job Position</p>
                    <p className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">ATS Score</p>
                    <p className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Improvement</p>
                    <p className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</p>
                    <p className="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">View</p>
                  </div>

                  {/* Table rows */}
                  <div className="divide-y divide-slate-50">
                    {sessions.map((session) => {
                      const scoreColor = getScoreColor(session.match_score);
                      const before = session.tailored_cv?.scoreBreakdown?.keywordsBefore || 0;
                      const improvement = session.match_score - before;

                      return (
                        <div
                          key={session.id}
                          className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-slate-50 transition-colors items-center"
                        >
                          <div className="col-span-5">
                            <p className="text-sm font-medium text-slate-800 truncate">{getJobTitle(session)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{session.tailored_cv?.name}</p>
                          </div>
                          <div className="col-span-2">
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full"
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
                              {new Date(session.created_at).toLocaleDateString("en-GB", {
                                day: "numeric", month: "short"
                              })}
                            </p>
                          </div>
                          <div className="col-span-1">
                            <button
                              onClick={() => { setSelectedSession(session); setSessionTab("tailored"); }}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-400 transition-all text-slate-600"
                            >
                              View
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

          {/* Sidebar */}
          <div className="w-72 shrink-0 space-y-4 sticky top-24">

            {/* Credits */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="px-5 py-4"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Credits
                </p>
                <p className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {userData?.tailor_credits === 999999 ? "∞" : userData?.tailor_credits ?? 0}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>tailors remaining</p>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-xs text-slate-600">Tailoring</p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
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
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <p className="text-xs text-slate-600">PDF Downloads</p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: (userData?.pdf_credits ?? 0) > 0 ? "#d1fae5" : "#fee2e2",
                      color: (userData?.pdf_credits ?? 0) > 0 ? "#065f46" : "#991b1b",
                    }}
                  >
                    {userData?.pdf_credits === 999999 ? "Unlimited" : `${userData?.pdf_credits ?? 0} left`}
                  </span>
                </div>

                <div className="h-px bg-slate-100" />

                <Link
                  href="/pricing"
                  className="block w-full text-center text-sm font-semibold text-white py-3 rounded-xl transition-all"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  Get More Credits →
                </Link>
              </div>
            </div>

            {/* ATS Progress */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">ATS Progress</p>
              <div className="text-center mb-4">
                <p
                  className="text-5xl font-bold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: "#0d1f3c" }}
                >
                  {avgScore}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Average ATS score across {sessions.length} tailored CV{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>

              {sessions.length > 0 && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${avgScore}%`,
                      background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Quick actions</p>
              <div className="space-y-1">
                <Link
                  href="/upload"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">New tailor</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <div className="h-px bg-slate-100" />
                <Link
                  href="/pricing"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">Buy credits</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Session detail modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
            >
              <div>
                <p className="text-white font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {selectedSession.tailored_cv?.name}
                </p>
                <p className="text-blue-200 text-xs mt-0.5 truncate max-w-sm">
                  {getJobTitle(selectedSession)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "white",
                  }}
                >
                  {selectedSession.match_score}% ATS
                </span>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-white opacity-60 hover:opacity-100 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex border-b border-slate-200">
              {[
                { id: "tailored", label: "Tailored CV" },
                { id: "original", label: "Original CV" },
                { id: "job", label: "Job Description" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSessionTab(tab.id as any)}
                  className="flex-1 py-3 text-xs font-semibold transition-all"
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
            <div className="p-6 overflow-y-auto max-h-[55vh]">
              {sessionTab === "tailored" && selectedSession.tailored_cv && (
                <div className="space-y-5 text-sm text-slate-700">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <p className="font-bold text-slate-900 text-base uppercase tracking-widest">
                      {selectedSession.tailored_cv.name}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {[selectedSession.tailored_cv.email, selectedSession.tailored_cv.phone, selectedSession.tailored_cv.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {selectedSession.tailored_cv.summary && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Summary</p>
                      <p className="text-sm leading-relaxed">{selectedSession.tailored_cv.summary}</p>
                    </div>
                  )}

                  {selectedSession.tailored_cv.skills?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills</p>
                      {selectedSession.tailored_cv.skills.map((g: any, i: number) => (
                        <div key={i} className="flex gap-2 text-sm mb-1">
                          <span className="font-bold text-slate-800 shrink-0">{g.category}:</span>
                          <span className="text-slate-600">{g.skills.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSession.tailored_cv.experience?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</p>
                      {selectedSession.tailored_cv.experience.map((job: any, i: number) => (
                        <div key={i} className="mb-4">
                          <div className="flex justify-between">
                            <p className="font-bold text-slate-900">{job.title}</p>
                            <p className="text-xs text-slate-400">{job.dates}</p>
                          </div>
                          <p className="text-xs italic text-slate-500 mb-1">{job.company}</p>
                          {job.bullets?.map((b: string, j: number) => (
                            <p key={j} className="text-xs text-slate-600 flex gap-1.5">
                              <span>•</span><span>{b}</span>
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sessionTab === "original" && (
                <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedSession.cv_text}
                </pre>
              )}

              {sessionTab === "job" && (
                <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
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