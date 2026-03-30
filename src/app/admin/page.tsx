"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const ADMIN_EMAIL = "nyamfusima@gmail.com";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Session {
  id: string;
  user_email: string;
  cv_text: string;
  job_description: string;
  tailored_cv: any;
  match_score: number;
  created_at: string;
}

interface Stats {
  totalSessions: number;
  totalUsers: number;
  avgScore: number;
  todaySessions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"cv" | "job" | "tailored">("tailored");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
    fetchData();
  }, [user, loading]);

  const fetchData = async () => {
    setFetching(true);
    const { data } = await supabaseAdmin
      .from("tailor_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setSessions(data);

      const totalSessions = data.length;
      const uniqueUsers = new Set(data.map((s: Session) => s.user_email)).size;
      const avgScore = data.length > 0
        ? Math.round(data.reduce((sum: number, s: Session) => sum + (s.match_score || 0), 0) / data.length)
        : 0;

      const today = new Date().toISOString().split("T")[0];
      const todaySessions = data.filter((s: Session) =>
        s.created_at.startsWith(today)
      ).length;

      setStats({
        totalSessions,
        totalUsers: uniqueUsers,
        avgScore,
        todaySessions,
      });
    }
    setFetching(false);
  };

  if (loading || fetching) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <span className="font-semibold text-slate-800 tracking-tight">my</span>
            <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
            <span className="font-semibold text-slate-800 tracking-tight">tailor.ai</span>
          </Link>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#0d1f3c" }}
          >
            Admin
          </span>
        </div>
        <button
          onClick={fetchData}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
        >
          ↺ Refresh
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total tailors", value: stats.totalSessions },
              { label: "Unique users", value: stats.totalUsers },
              { label: "Avg ATS score", value: `${stats.avgScore}%` },
              { label: "Today", value: stats.todaySessions },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: "#0d1f3c" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* Sessions list */}
          <div className="w-96 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              All sessions ({sessions.length})
            </p>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {sessions.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">No sessions yet.</p>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => { setSelected(session); setActiveTab("tailored"); }}
                  className="w-full text-left p-4 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: selected?.id === session.id ? "#f0f4ff" : "white",
                    borderColor: selected?.id === session.id ? "#0d1f3c" : "#e2e8f0",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {session.tailored_cv?.name || "Unknown"}
                    </p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: session.match_score >= 80 ? "#d1fae5" : session.match_score >= 60 ? "#fef3c7" : "#fee2e2",
                        color: session.match_score >= 80 ? "#065f46" : session.match_score >= 60 ? "#92400e" : "#991b1b",
                      }}
                    >
                      {session.match_score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{session.user_email}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {new Date(session.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Session detail */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-slate-400 text-sm">Select a session to view details</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Detail header */}
                <div
                  className="px-6 py-5 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  <div>
                    <p className="text-white font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {selected.tailored_cv?.name}
                    </p>
                    <p className="text-blue-200 text-xs mt-0.5">{selected.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{selected.match_score}%</p>
                    <p className="text-blue-200 text-xs">ATS score</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                  {[
                    { id: "tailored", label: "Tailored CV" },
                    { id: "cv", label: "Original CV" },
                    { id: "job", label: "Job Description" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className="px-5 py-3 text-xs font-semibold transition-all"
                      style={{
                        color: activeTab === tab.id ? "#0d1f3c" : "#94a3b8",
                        borderBottom: activeTab === tab.id ? "2px solid #0d1f3c" : "2px solid transparent",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6 max-h-[55vh] overflow-y-auto">

                  {activeTab === "tailored" && selected.tailored_cv && (
                    <div className="font-serif space-y-5 text-sm text-slate-700">
                      {/* Contact */}
                      <div className="text-center pb-4 border-b border-slate-100">
                        <p className="font-bold text-slate-900 text-base uppercase tracking-widest">{selected.tailored_cv.name}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {[selected.tailored_cv.email, selected.tailored_cv.phone, selected.tailored_cv.location].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      {/* Summary */}
                      {selected.tailored_cv.summary && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Summary</p>
                          <p className="text-sm leading-relaxed">{selected.tailored_cv.summary}</p>
                        </div>
                      )}

                      {/* Skills */}
                      {selected.tailored_cv.skills?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Skills</p>
                          {selected.tailored_cv.skills.map((g: any, i: number) => (
                            <div key={i} className="flex gap-2 text-sm mb-1">
                              <span className="font-bold text-slate-800 shrink-0">{g.category}:</span>
                              <span className="text-slate-600">{g.skills.join(", ")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Experience */}
                      {selected.tailored_cv.experience?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</p>
                          {selected.tailored_cv.experience.map((job: any, i: number) => (
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

                  {activeTab === "cv" && (
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                      {selected.cv_text}
                    </pre>
                  )}

                  {activeTab === "job" && (
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                      {selected.job_description}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}