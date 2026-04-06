"use client";
import { useEffect, useState } from "react";
import { TailoredCV } from "@/lib/types";

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
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJobs(data.jobs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#94a3b8";

  const scoreBg = (score: number) =>
    score >= 80 ? "#d1fae5" : score >= 60 ? "#fef3c7" : "#f1f5f9";

  const scoreText = (score: number) =>
    score >= 80 ? "#065f46" : score >= 60 ? "#92400e" : "#475569";

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mt-6">
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
          <p className="text-xs text-slate-400">Searching real listings based on your tailored CV</p>
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
      <p className="text-sm text-slate-400 text-center">Could not load job matches right now.</p>
    </div>
  );

  if (jobs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">

      {/* Header */}
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
            <p className="text-blue-200 text-xs">{jobs.length} real listings found · ranked by match</p>
          </div>
        </div>
        <button
          onClick={fetchJobs}
          className="text-blue-200 hover:text-white text-xs font-medium transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Jobs list */}
      <div className="divide-y divide-slate-100">
        {jobs.map((job) => (
          <div key={job.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                  {job.isRemote && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Remote
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{job.company} · {job.location}</p>
              </div>

              {/* Match score */}
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

            {/* Matched skills */}
            {job.matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {job.matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
                  >
                    ✓ {skill}
                  </span>
                ))}
                {job.missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                  >
                    ⚠ {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Expandable description */}
            {expanded === job.id && (
              <p className="text-xs text-slate-500 leading-relaxed mb-3 bg-slate-50 rounded-xl p-3">
                {job.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-white px-4 py-2 rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                Apply now →
              </a>
              <button
                onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
              >
                {expanded === job.id ? "Hide details" : "View details"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          Jobs pulled from live listings · Updated daily · Click Apply to go directly to the job
        </p>
      </div>
    </div>
  );
}