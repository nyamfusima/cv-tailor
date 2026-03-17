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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <p className="text-neutral-500 text-sm">Loading...</p>
    </div>
  );

  const scoreColor =
    cv.matchScore >= 80 ? "#34d399" :
    cv.matchScore >= 60 ? "#fbbf24" : "#f87171";

  const scoreLabel =
    cv.matchScore >= 80 ? "Strong match — go for it" :
    cv.matchScore >= 60 ? "Good match — review before applying" :
    "Weak match — consider more tailoring";

  const scoreTailwind =
    cv.matchScore >= 80 ? "text-emerald-400" :
    cv.matchScore >= 60 ? "text-amber-400" : "text-red-400";

  const circumference = 2 * Math.PI * 38;

  const handleDownload = async () => {
    setDownloading(true);
    await downloadPDF(cv);
    setDownloading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-5 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold">CV</div>
          <span className="text-sm font-medium text-neutral-200">TailorCV</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500">Step 2 of 2 — Review & Download</span>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            ← Start over
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* ATS Score */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400 mb-1">ATS match score</p>
            <p className={`text-sm font-medium mt-2 ${scoreTailwind}`}>{scoreLabel}</p>
          </div>
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg width="96" height="96" className="-rotate-90">
              <circle cx="48" cy="48" r="38" fill="none" stroke="#262626" strokeWidth="7" />
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
              <span className={`text-xl font-semibold ${scoreTailwind}`}>{cv.matchScore}</span>
              <span className="text-[10px] text-neutral-500">/ 100</span>
            </div>
          </div>
        </div>

        {/* CV Preview */}
        <div className="bg-white text-neutral-900 rounded-2xl p-10 shadow-xl font-serif">
          {/* Contact */}
          <div className="border-b border-neutral-200 pb-6 mb-6 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2 uppercase tracking-widest">{cv.name}</h1>
            <p className="text-sm text-neutral-500">
              {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* Summary */}
          {cv.summary && (
            <div className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 mb-1">Summary</h2>
              <hr className="border-neutral-300 mb-3" />
              <p className="text-sm text-neutral-700 leading-relaxed">{cv.summary}</p>
            </div>
          )}

          {/* Key Skills */}
          {cv.skills?.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 mb-1">Key Skills</h2>
              <hr className="border-neutral-300 mb-3" />
              <div className="space-y-1.5">
                {cv.skills.map((group, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="font-bold text-neutral-900 shrink-0">{group.category}:</span>
                    <span className="text-neutral-700">{group.skills.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {cv.experience?.length > 0 && (
            <div className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 mb-1">Experience</h2>
              <hr className="border-neutral-300 mb-3" />
              <div className="space-y-5">
                {cv.experience.map((job, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-bold text-neutral-900">{job.title}</p>
                      <p className="text-xs italic text-neutral-500 whitespace-nowrap ml-4">{job.dates}</p>
                    </div>
                    <p className="text-sm italic text-neutral-500 mb-2">{job.company}</p>
                    <ul className="space-y-1">
                      {job.bullets.map((b, j) => (
                        <li key={j} className="text-sm text-neutral-700 flex gap-2">
                          <span className="shrink-0">•</span>
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
            <div className="mb-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 mb-1">Education</h2>
              <hr className="border-neutral-300 mb-3" />
              <div className="space-y-4">
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-neutral-900">{edu.degree}</p>
                      <p className="text-xs italic text-neutral-500">{edu.dates}</p>
                    </div>
                    <p className="text-sm italic text-neutral-500 mb-1">{edu.institution}</p>
                    {edu.coursework && edu.coursework.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        <span className="font-semibold not-italic text-neutral-600">Relevant coursework: </span>
                        {edu.coursework.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            ← Tailor another CV
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating PDF...
              </span>
            ) : "Download PDF →"}
          </button>
        </div>
      </main>
    </div>
  );
}