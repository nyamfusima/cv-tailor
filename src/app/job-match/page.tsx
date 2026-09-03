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

type Stage = "idle" | "downloading" | "extracting" | "searching" | "done";

export default function JobMatchPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [adminData, setAdminData] = useState<AdminCVData | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [cvText, setCvText] = useState<string | null>(null);
  const [hasMasterCV, setHasMasterCV] = useState<boolean | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{ primaryTitle: string; skills: string[] } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/signin"); return; }

    // Check for admin-injected CV first
    const raw = sessionStorage.getItem("adminCV");
    if (raw) {
      try {
        const data: AdminCVData = JSON.parse(raw);
        sessionStorage.removeItem("adminCV");
        console.log("[job-match] Admin mode — injected CV for:", data.userName, data.userEmail);
        setAdminData(data);
        setCvText(data.cvText);
        runJobMatch(data.cvText);
        return;
      } catch (e) {
        console.warn("[job-match] Failed to parse adminCV from sessionStorage:", e);
      }
    }

    // Normal user — check for master CV
    checkMasterCV();
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkMasterCV = async () => {
    if (!user) return;
    console.log("[job-match] Checking user record for:", user.id);
    await fetch("/api/account/plan", { credentials: "include" }).catch(() => null);
    const { data, error } = await supabase
      .from("users")
      .select("master_cv_path, master_cv_name, plan")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[job-match] Failed to fetch user record:", error.message);
      setHasMasterCV(false);
      setIsPro(false);
      return;
    }

    console.log("[job-match] Master CV path:", data?.master_cv_path ?? "none", "| plan:", data?.plan);
    setIsPro(data?.plan === "pro");
    setHasMasterCV(!!data?.master_cv_path);
  };

  const downloadAndExtract = async (): Promise<string | null> => {
    if (!user) return null;

    // Step 1: Get a signed URL from the server (bypasses storage RLS)
    setStage("downloading");
    console.log("[job-match] Fetching signed CV URL...");
    const urlRes = await fetch("/api/master-cv-url");
    const urlData = await urlRes.json();

    if (!urlRes.ok) {
      const msg = urlData.error || "Could not retrieve master CV.";
      console.error("[job-match] master-cv-url error:", msg);
      throw new Error(msg);
    }

    const { url: signedUrl, name: master_cv_name } = urlData as { url: string; name: string };
    console.log(`[job-match] Downloading CV from signed URL, file="${master_cv_name}"`);

    // Step 2: Download using the signed URL
    const blob = await fetch(signedUrl).then((r) => {
      if (!r.ok) throw new Error("Failed to download CV file.");
      return r.blob();
    });
    console.log(`[job-match] Downloaded ${blob.size} bytes`);

    // Step 3: Send to extract-cv-text
    setStage("extracting");
    const fileName = master_cv_name || "cv.pdf";
    const mimeType = fileName.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
    const file = new File([blob], fileName, { type: mimeType });

    console.log(`[job-match] Sending to /api/extract-cv-text: "${fileName}" ${file.size}B`);
    const form = new FormData();
    form.append("cv", file);

    const extractRes = await fetch("/api/extract-cv-text", { method: "POST", body: form });
    const extractData = await extractRes.json();

    if (!extractRes.ok) {
      console.error("[job-match] extract-cv-text failed:", extractData.error);
      throw new Error(extractData.error || "Failed to extract CV text.");
    }

    const text: string = extractData.text;
    console.log(`[job-match] Extracted ${text.length} chars from CV`);
    return text;
  };

  const runJobMatch = async (text: string) => {
    if (!text || stage === "searching") return;
    setStage("searching");
    setError(null);
    setSearched(true);

    console.log(`[job-match] Sending ${text.length} chars to /api/job-match...`);

    try {
      const res = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("[job-match] /api/job-match returned error:", data.error, "status:", res.status);
        throw new Error(data.error || "Failed to fetch jobs.");
      }

      const jobList: Job[] = data.jobs || [];
      console.log(`[job-match] Received ${jobList.length} jobs, query:`, data.query);
      setJobs(jobList);
      setQuery(data.query);
    } catch (err: any) {
      console.error("[job-match] runJobMatch error:", err.message);
      setError(err.message);
    } finally {
      setStage("done");
    }
  };

  const handleFindJobs = async () => {
    setError(null);
    try {
      let text = cvText;
      if (!text) {
        text = await downloadAndExtract();
        if (!text) return;
        setCvText(text);
      }
      await runJobMatch(text);
    } catch (err: any) {
      console.error("[job-match] handleFindJobs error:", err.message);
      setError(err.message);
      setStage("done");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  const isSearching = stage === "downloading" || stage === "extracting" || stage === "searching";

  const stageLabel: Record<Stage, string> = {
    idle: "",
    downloading: "Downloading your CV...",
    extracting: "Reading CV text...",
    searching: "Searching for matching jobs...",
    done: "",
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-0">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">my</span>
            <img src="/favicon.ico" alt="myCVtailor" className="w-4 h-4 mx-0.5" />
            <span className="font-semibold text-[#0d1f3c] tracking-tight text-sm">tailor.co.za</span>
          </Link>
          {adminData && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#0d1f3c" }}>
              Admin
            </span>
          )}
        </div>
        <div>
          {adminData ? (
            <Link href="/admin" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200">
              ← Back to admin
            </Link>
          ) : (
            <Link href="/dashboard" className="rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#183763]">
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Admin banner */}
        {adminData && (
          <div
            className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-4 bg-[#4F46E5]"
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
            style={{ color: "#0d1f3c" }}
          >
            {isSearching ? stageLabel[stage] : jobs.length > 0 ? "Your job matches" : "Find matching jobs"}
          </h1>
          {query && !isSearching && (
            <p className="text-sm text-slate-400">
              Searching for{" "}
              <span className="font-semibold text-slate-600">{query.primaryTitle}</span> roles
              {query.skills.length > 0 && <> · {query.skills.slice(0, 3).join(", ")}</>}
            </p>
          )}
        </div>

        {/* Pro gate — free plan users */}
        {!adminData && isPro === false && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[#4F46E5]"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-slate-900 font-semibold text-base mb-1">Pro plan required</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
              Job matching is available on the Pro plan. Upgrade to find jobs that match your CV instantly.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#183763] transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* No master CV */}
        {!adminData && isPro !== false && hasMasterCV === false && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <p className="text-slate-700 font-semibold mb-1">No master CV uploaded</p>
            <p className="text-sm text-slate-400 mb-6">
              Upload your CV on the dashboard first, then come back here to find matching jobs.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#183763] transition-colors"
            >
              Go to dashboard →
            </Link>
          </div>
        )}

        {/* CTA for normal users */}
        {!adminData && isPro !== false && hasMasterCV === true && !searched && !isSearching && (
          <button
            onClick={handleFindJobs}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#183763] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find matching jobs
          </button>
        )}

        {/* Loading */}
        {isSearching && (
          <div className="flex items-center gap-3 py-6">
            <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-400">{stageLabel[stage]}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={handleFindJobs}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#183763] transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Job results */}
        {jobs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {jobs.length} matches
              </p>
              <button
                onClick={handleFindJobs}
                disabled={isSearching}
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
              >
                ↺ Refresh
              </button>
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
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium text-[10px]">Remote</span>
                      )}
                    </div>

                    {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.matchedSkills.map(s => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                            {s}
                          </span>
                        ))}
                        {job.missingSkills.map(s => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-slate-50 text-slate-400 font-medium border border-slate-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto block w-full text-center text-xs font-semibold text-white py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#183763] transition-colors"
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
        {searched && stage === "done" && jobs.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <p className="text-slate-700 font-semibold mb-1">No matches found</p>
            <p className="text-sm text-slate-400 mb-4">
              Try tailoring your CV to a specific job first to improve matching.
            </p>
            <button
              onClick={handleFindJobs}
              className="text-xs font-semibold text-white px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#183763] transition-colors"
            >
              Try again
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
