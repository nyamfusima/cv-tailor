"use client";
import { useRouter } from "next/navigation";
import { JobListing } from "@/lib/types";

export default function JobCard({ job }: { job: JobListing }) {
  const router = useRouter();

  const badgeColor =
    job.matchScore >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : job.matchScore >= 60
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-red-50 text-red-700 border-red-100";

  const dotColor =
    job.matchScore >= 80 ? "#10b981" : job.matchScore >= 60 ? "#f59e0b" : "#ef4444";

  const handleTailorForJob = () => {
    sessionStorage.setItem("prefillJobTitle", job.title);
    router.push("/upload");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{job.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
        </div>
        <div
          className={`shrink-0 inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColor}`}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
          {job.matchScore}% match
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {job.location}
      </div>

      {/* Matched skills */}
      {job.matchedSkills.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Matched skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing skills */}
      {job.missingSkills.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Skills to highlight
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.missingSkills.map((skill) => (
              <span
                key={skill}
                className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-slate-100">
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: "#0d1f3c" }}
        >
          Apply Now →
        </a>
        <button
          onClick={handleTailorForJob}
          className="flex-1 text-xs font-semibold px-4 py-2 rounded-xl border transition-all duration-200 hover:bg-slate-50"
          style={{ borderColor: "#0d1f3c", color: "#0d1f3c" }}
        >
          Tailor CV for this
        </button>
      </div>
    </div>
  );
}
