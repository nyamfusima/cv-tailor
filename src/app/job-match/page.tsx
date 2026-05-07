"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  applyUrl: string;
  postedAt: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  description: string;
}

interface AdminCVData {
  cvText: string;
  userName: string;
  userEmail: string;
}

export default function JobMatchPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [adminData, setAdminData] = useState<AdminCVData | null>(null);
  const [cvText, setCvText] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{ primaryTitle: string; skills: string[] } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/signin"); return; }

    const raw = sessionStorage.getItem("adminCV");
    if (raw) {
      try {
        const data: AdminCVData = JSON.parse(raw);
        sessionStorage.removeItem("adminCV");
        setAdminData(data);
        setCvText(data.cvText);
        runJobMatch(data.cvText);
      } catch {
        fetchLatestCVText();
      }
    } else {
      fetchLatestCVText();
    }
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLatestCVText = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tailor_sessions")
      .select("cv_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data?.cv_text) setCvText(data.cv_text);
  };

  const runJobMatch = async (text: string) => {
    if (!text || searching) return;
    setSearching(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");
      setJobs(data.jobs || []);
      setQuery(data.query);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">my</span>
            <img src="/favicon.ico" alt="myCVtailor" className="w-4 h-4 mx-0.5" />
            <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">tailor.ai</span>
          </Link>
          {adminData && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: "#0d1f3c" }}
            >
              Admin
            </span>
          )}
        </div>
        <div>
          {adminData ? (
            <Link
              href="/admin"
              className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
            >
              ← Back to admin
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Admin banner */}
        {adminData && (
          <div
            className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Running job match for {adminData.userName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {adminData.userEmail}
              </p>
            </div>
          </div>
        )}

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Job Match</p>
          <h1
            className="text-3xl sm:text-4xl text-[#0d1f3c] mb-2"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {searching ? "Finding your matches..." : jobs.length > 0 ? "Your job matches" : "Find matching jobs"}
          </h1>
          {query && !searching && (
            <p className="text-sm text-slate-400">
              Searching for{" "}
              <span className="font-semibold text-slate-600">{query.primaryTitle}</span>{" "}
              roles
              {query.skills.length > 0 && (
                <> · {query.skills.slice(0, 3).join(", ")}</>
              )}
            </p>
          )}
        </div>

        {/* No CV state */}
        {!cvText && !searching && !adminData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <p className="text-slate-700 font-semibold mb-1">No CV found</p>
            <p className="text-sm text-slate-400 mb-6">
              Tailor a CV to a job first — we&apos;ll use it to find your best matches.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
            >
              Tailor my CV →
            </Link>
          </div>
        )}

        {/* CTA for normal users before first search */}
        {cvText && !adminData && !searched && !searching && (
          <button
            onClick={() => runJobMatch(cvText)}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find matching jobs
          </button>
        )}

        {/* Loading spinner */}
        {searching && (
          <div className="flex items-center gap-3 py-6">
            <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-400">Analysing CV and searching for jobs...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Job results */}
        {jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {jobs.length} matches
              </p>
              {cvText && (
                <button
                  onClick={() => { setSearched(false); setJobs([]); setQuery(null); runJobMatch(cvText); }}
                  className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
                >
                  ↺ Refresh
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => {
                const scoreColor = job.matchScore >= 80
                  ? { bg: "#d1fae5", text: "#065f46" }
                  : job.matchScore >= 60
                  ? { bg: "#fef3c7", text: "#92400e" }
                  : { bg: "#fee2e2", text: "#991b1b" };

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0d1f3c] text-sm leading-snug">{job.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{job.company}</p>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}
                      >
                        {job.matchScore}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {job.location && <span>{job.location}</span>}
                      {job.isRemote && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium text-[10px]">
                          Remote
                        </span>
                      )}
                    </div>

                    {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.matchedSkills.map(s => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100"
                          >
                            {s}
                          </span>
                        ))}
                        {job.missingSkills.map(s => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 font-medium border border-slate-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto block w-full text-center text-xs font-semibold text-white py-2.5 rounded-xl hover:opacity-90 transition-all"
                      style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                    >
                      Apply →
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty state after search */}
        {searched && !searching && jobs.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <p className="text-slate-700 font-semibold mb-1">No matches found</p>
            <p className="text-sm text-slate-400">
              Try tailoring your CV with a specific job description to improve matching.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
