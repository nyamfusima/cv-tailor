"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TailoredCV } from "@/lib/types";
import { downloadPDF } from "@/lib/generatePDF";

export default function ResultsPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("tailoredCV");
    if (!stored) { router.push("/"); return; }
    const parsed = JSON.parse(stored);
    setCV(parsed);
    const timeout = setTimeout(() => setAnimatedScore(parsed.matchScore), 300);
    return () => clearTimeout(timeout);
  }, [router]);

  if (!cv) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  const scoreColor =
    cv.matchScore >= 80 ? "#10b981" :
    cv.matchScore >= 60 ? "#f59e0b" : "#ef4444";

  const scoreLabel =
    cv.matchScore >= 80 ? "Strong match — go for it" :
    cv.matchScore >= 60 ? "Good match — review before applying" :
    "Weak match — consider more tailoring";

  const scoreBg =
    cv.matchScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
    cv.matchScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-100" :
    "bg-red-50 text-red-700 border-red-100";

  const circumference = 2 * Math.PI * 38;

  const handleDownload = async () => {
    setDownloading(true);
    await downloadPDF(cv);
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.ico" alt="TailorCV" className="w-7 h-7" />
          <span className="font-semibold text-slate-800 tracking-tight">tailormyCV.ai</span>
          </div>
        <div className="flex items-center gap-5">
          <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Step 2 of 2</span>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Start over
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Score card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ATS Match Score</p>
            <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs font-semibold ${scoreBg}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }}></span>
              {scoreLabel}
            </div>
          </div>
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg width="96" height="96" className="-rotate-90">
              <circle cx="48" cy="48" r="38" fill="none" stroke="#f1f5f9" strokeWidth="7" />
              <circle
                cx="48" cy="48" r="38"
                fill="none"
                stroke={scoreColor}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (animatedScore / 100) * circumference}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1.2s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-slate-800">{cv.matchScore}</span>
              <span className="text-[10px] text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* CV Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

          {/* CV Header */}
          <div className="px-10 py-8 text-center border-b border-slate-100" style={{ backgroundColor: "#0d1f3c" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-white mb-2 tracking-tight">{cv.name}</h1>
            <p className="text-sm text-blue-200">
              {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ")}
            </p>
          </div>

          <div className="px-10 py-8 font-serif">

            {/* Summary */}
            {cv.summary && (
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Summary</h2>
                <div className="h-px bg-slate-200 mb-3" />
                <p className="text-sm text-slate-700 leading-relaxed">{cv.summary}</p>
              </div>
            )}

            {/* Key Skills */}
            {cv.skills?.length > 0 && (
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Skills</h2>
                <div className="h-px bg-slate-200 mb-3" />
                <div className="space-y-1.5">
                  {cv.skills.map((group, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="font-bold text-slate-800 shrink-0 min-w-[120px]">{group.category}:</span>
                      <span className="text-slate-600">{group.skills.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {cv.experience?.length > 0 && (
              <div className="mb-7">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</h2>
                <div className="h-px bg-slate-200 mb-3" />
                <div className="space-y-6">
                  {cv.experience.map((job, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-sm font-bold text-slate-900">{job.title}</p>
                        <p className="text-xs italic text-slate-400 whitespace-nowrap ml-4">{job.dates}</p>
                      </div>
                      <p className="text-sm italic text-slate-500 mb-2">{job.company}</p>
                      <ul className="space-y-1.5">
                        {job.bullets.map((b, j) => (
                          <li key={j} className="text-sm text-slate-600 flex gap-2">
                            <span className="shrink-0 text-slate-300 mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {cv.education?.length > 0 && (
              <div className="mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Education</h2>
                <div className="h-px bg-slate-200 mb-3" />
                <div className="space-y-4">
                  {cv.education.map((edu, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-slate-900">{edu.degree}</p>
                        <p className="text-xs italic text-slate-400">{edu.dates}</p>
                      </div>
                      <p className="text-sm italic text-slate-500 mb-1">{edu.institution}</p>
                      {edu.coursework && edu.coursework.length > 0 && (
                        <p className="text-xs text-slate-500">
                          <span className="font-semibold not-italic text-slate-600">Relevant coursework: </span>
                          {edu.coursework.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Tailor another CV
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-white font-semibold px-8 py-3.5 rounded-2xl transition-all duration-200 text-sm flex items-center gap-2"
            style={{
              backgroundColor: downloading ? "#94a3b8" : "#0d1f3c",
              cursor: downloading ? "not-allowed" : "pointer",
            }}
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating PDF...
              </>
            ) : "Download PDF →"}
          </button>
        </div>
      </main>
    </div>
  );
}