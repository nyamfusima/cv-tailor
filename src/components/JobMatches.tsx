"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TailoredCV } from "@/lib/types";

type TrendDirection = "up" | "down" | "flat" | "unknown";

interface SalaryInsights {
  minSalary?: number;
  maxSalary?: number;
  averageSalary?: number;
  currency?: string;
  trend: TrendDirection;
  trendPercent?: number;
}

interface SalaryCacheEntry {
  status: "idle" | "loading" | "success" | "empty" | "error";
  data?: SalaryInsights;
  error?: string;
}

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

export default function JobMatches({
  cv,
  jobDescription,
}: {
  cv: TailoredCV;
  jobDescription: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [salaryByJobId, setSalaryByJobId] = useState<Record<string, SalaryCacheEntry>>({});
  const [locationPref, setLocationPref] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId],
  );

  const selectedSalary = selectedJob ? salaryByJobId[selectedJob.id] : undefined;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, jobDescription, locationPreference: locationPref }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Job search returned an unexpected response. Please try again.");
      }

      if (!res.ok) throw new Error(data?.error || "Failed to fetch jobs");

      const fetchedJobs: Job[] = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(fetchedJobs);
      setSelectedJobId(fetchedJobs.length > 0 ? fetchedJobs[0].id : null);
      setSalaryByJobId({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch jobs";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cv, jobDescription, locationPref]);

  const fetchSalaryInsights = useCallback(async (job: Job) => {
    const existing = salaryByJobId[job.id];
    if (existing && (existing.status === "loading" || existing.status === "success" || existing.status === "empty")) {
      return;
    }

    setSalaryByJobId((prev) => ({
      ...prev,
      [job.id]: { status: "loading" },
    }));

    try {
      const res = await fetch("/api/salary-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          location: job.location,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch salary insights");

      if (!data.ok || !data.insights) {
        setSalaryByJobId((prev) => ({
          ...prev,
          [job.id]: {
            status: "empty",
            error: data.reason || "Salary insights unavailable",
          },
        }));
        return;
      }

      setSalaryByJobId((prev) => ({
        ...prev,
        [job.id]: {
          status: "success",
          data: data.insights as SalaryInsights,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch salary insights";
      setSalaryByJobId((prev) => ({
        ...prev,
        [job.id]: {
          status: "error",
          error: message,
        },
      }));
    }
  }, [salaryByJobId]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!selectedJobId) return;
    const selected = jobs.find((job) => job.id === selectedJobId);
    if (!selected) return;
    void fetchSalaryInsights(selected);
  }, [selectedJobId, jobs, fetchSalaryInsights]);

  const scoreColor = (score: number) =>
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#94a3b8";

  const scoreBg = (score: number) =>
    score >= 80 ? "#d1fae5" : score >= 60 ? "#fef3c7" : "#f1f5f9";

  const scoreText = (score: number) =>
    score >= 80 ? "#065f46" : score >= 60 ? "#92400e" : "#475569";

  const formatMoney = (amount?: number, currency = "USD") => {
    if (!amount || !Number.isFinite(amount)) return "N/A";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
    }
  };

  const salaryRangeLabel = (insights?: SalaryInsights) => {
    if (!insights) return "Not available";
    const currency = insights.currency || "USD";
    const min = insights.minSalary;
    const max = insights.maxSalary;

    if (min && max) return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
    if (min) return `From ${formatMoney(min, currency)}`;
    if (max) return `Up to ${formatMoney(max, currency)}`;
    return "Not available";
  };

  const trendMeta = (trend: TrendDirection) => {
    if (trend === "up") return { label: "Upward", icon: "UP", color: "text-emerald-700 bg-emerald-50" };
    if (trend === "down") return { label: "Downward", icon: "DOWN", color: "text-rose-700 bg-rose-50" };
    if (trend === "flat") return { label: "Stable", icon: "FLAT", color: "text-slate-700 bg-slate-100" };
    return { label: "Unknown", icon: "-", color: "text-slate-500 bg-slate-100" };
  };

  const locationBar = (
    <div className="flex items-center gap-2 flex-wrap px-5 py-3 border-b border-slate-100 bg-white">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Location:</span>

      <button
        onClick={() => { setLocationPref(""); setShowLocationInput(false); }}
        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
          locationPref === "" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Auto-detect
      </button>

      <button
        onClick={() => { setLocationPref("remote"); setShowLocationInput(false); }}
        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
          locationPref === "remote" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Remote only
      </button>

      {locationPref !== "" && locationPref !== "remote" ? (
        <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium bg-slate-800 text-white">
          {locationPref}
          <button
            onClick={() => setLocationPref("")}
            className="opacity-60 hover:opacity-100 leading-none"
            aria-label="Clear location"
          >
            ×
          </button>
        </span>
      ) : (
        <button
          onClick={() => setShowLocationInput(true)}
          className="text-xs px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          Specify country...
        </button>
      )}

      {showLocationInput && (
        <div className="flex gap-1.5 items-center">
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && locationInput.trim()) {
                setLocationPref(locationInput.trim());
                setLocationInput("");
                setShowLocationInput(false);
              }
              if (e.key === "Escape") setShowLocationInput(false);
            }}
            placeholder="e.g. South Africa, UK, Canada"
            autoFocus
            className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg outline-none focus:border-slate-400 w-44"
          />
          <button
            onClick={() => {
              if (locationInput.trim()) {
                setLocationPref(locationInput.trim());
                setLocationInput("");
                setShowLocationInput(false);
              }
            }}
            className="text-xs px-2.5 py-1 rounded-lg text-white font-medium"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Search
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {locationBar}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Finding jobs you can apply to...</p>
              <p className="text-xs text-slate-400">
                {locationPref === "remote"
                  ? "Searching remote listings worldwide"
                  : locationPref
                  ? `Searching listings in ${locationPref}`
                  : "Searching real listings based on your tailored CV"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {locationBar}
        <div className="p-6 text-center">
          <p className="text-sm text-slate-700 font-medium mb-1">Could not load job matches</p>
          <p className="text-xs text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => void fetchJobs()}
            className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {locationBar}
        <div className="p-6 text-center">
          <p className="text-sm text-slate-700 font-medium mb-1">No matching jobs found</p>
          <p className="text-xs text-slate-400 mb-4">
            {locationPref ? "Try a different location or switch to Auto-detect." : "Try refreshing — listings update frequently."}
          </p>
          <button
            onClick={() => void fetchJobs()}
            className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Jobs you can apply to right now</p>
            <p className="text-blue-200 text-xs">{jobs.length} real listings found - ranked by match</p>
          </div>
        </div>
        <button
          onClick={() => void fetchJobs()}
          className="text-blue-200 hover:text-white text-xs font-medium transition-colors"
        >
          Refresh
        </button>
      </div>
      {locationBar}

      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="divide-y divide-slate-100 lg:border-r lg:border-slate-200">
          {jobs.map((job) => {
            const isSelected = selectedJob?.id === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className={`w-full p-5 text-left transition-colors ${
                  isSelected ? "bg-slate-50" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                      {job.isRemote && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Remote
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {job.company} - {job.location}
                    </p>
                  </div>

                  <div
                    className="shrink-0 text-center px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: scoreBg(job.matchScore) }}
                  >
                    <p className="text-lg font-bold" style={{ color: scoreColor(job.matchScore) }}>
                      {job.matchScore}%
                    </p>
                    <p className="text-[10px] font-medium" style={{ color: scoreText(job.matchScore) }}>
                      match
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6 bg-slate-50/60">
          {selectedJob && (
            <>
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900">{selectedJob.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedJob.company} - {selectedJob.location}
                </p>
              </div>

              <div
                className="rounded-xl p-4 mb-3 border border-slate-200 bg-white"
                style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Match score
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold" style={{ color: scoreColor(selectedJob.matchScore) }}>
                    {selectedJob.matchScore}%
                  </span>
                  <span className="text-xs text-slate-500 mb-1">fit</span>
                </div>
              </div>

              <div
                className="rounded-xl p-4 mb-5 border border-slate-200 bg-white"
                style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Salary insights
                </p>

                {selectedSalary?.status === "loading" && (
                  <p className="text-xs text-slate-500">Loading salary insights...</p>
                )}

                {selectedSalary?.status === "error" && (
                  <p className="text-xs text-rose-600">{selectedSalary.error || "Could not load salary insights."}</p>
                )}

                {selectedSalary?.status === "empty" && (
                  <p className="text-xs text-slate-500">No salary data available for this role yet.</p>
                )}

                {selectedSalary?.status === "success" && selectedSalary.data && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Estimated range</p>
                      <p className="text-sm font-semibold text-slate-800">{salaryRangeLabel(selectedSalary.data)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Average salary</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatMoney(selectedSalary.data.averageSalary, selectedSalary.data.currency || "USD")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Salary trend</p>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${trendMeta(selectedSalary.data.trend).color}`}
                      >
                        <span>{trendMeta(selectedSalary.data.trend).icon}</span>
                        <span>{trendMeta(selectedSalary.data.trend).label}</span>
                        {selectedSalary.data.trendPercent !== undefined && (
                          <span>({selectedSalary.data.trendPercent}%)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Matched skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
                    >
                      + {skill}
                    </span>
                  ))}
                  {selectedJob.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                    >
                      ! {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Job summary</p>
                <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-200 rounded-xl p-3">
                  {selectedJob.description}
                </p>
              </div>

              <a
                href={selectedJob.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-xs font-semibold text-white px-4 py-2.5 rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                Apply now -&gt;
              </a>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          Jobs pulled from live listings - salary insights shown when available.
        </p>
      </div>
    </div>
  );
}

