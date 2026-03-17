"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TailoredCV } from "@/lib/types";
import { downloadPDF } from "@/lib/generatePDF";

function ScoreBar({ label, before, after, weight }: { label: string; before: number; after: number; weight: number }) {
  const [animated, setAnimated] = useState(false);
  const lift = after - before;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400 font-medium">{weight}% weight</span>
        </div>
        <div className="flex items-center gap-2">
          {lift > 0 && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              ↑ +{lift}%
            </span>
          )}
          <span className="text-xs font-bold text-slate-800">{after}%</span>
        </div>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-slate-300 transition-all duration-700 ease-out"
          style={{ width: animated ? `${before}%` : "0%" }}
        />
        <div
          className="absolute h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: animated ? `${after}%` : "0%",
            backgroundColor: after >= 80 ? "#10b981" : after >= 60 ? "#f59e0b" : "#ef4444",
            transitionDelay: "200ms",
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">Before: {before}%</span>
        <span className="text-[10px] text-slate-400">After: {after}%</span>
      </div>
    </div>
  );
}

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

  const scoreBg =
    cv.matchScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
    cv.matchScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-100" :
    "bg-red-50 text-red-700 border-red-100";

  const scoreLabel =
    cv.matchScore >= 80 ? "Strong match" :
    cv.matchScore >= 60 ? "Good match" : "Needs work";

  const circumference = 2 * Math.PI * 38;
  const bd = cv.scoreBreakdown;

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
          <span className="font-semibold text-slate-800 tracking-tight">TailorCV</span>
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

      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* Two column layout */}
        <div className="flex gap-8 items-start">

          {/* LEFT — CV */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

              {/* CV Header */}
              <div className="px-10 py-8 text-center" style={{ backgroundColor: "#0d1f3c" }}>
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
                  <div className="mb-7">
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

                {/* Professional Development */}
                {cv.certifications && cv.certifications.length > 0 && (
                  <div className="mb-2">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Professional Development</h2>
                    <div className="h-px bg-slate-200 mb-3" />
                    <div className="space-y-3">
                      {cv.certifications.map((cert, i) => (
                        <div key={i} className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{cert.name}</p>
                            <p className="text-xs italic text-slate-500">{cert.issuer}</p>
                          </div>
                          <p className="text-xs italic text-slate-400 whitespace-nowrap ml-4">{cert.date}</p>
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
          </div>

          {/* RIGHT — Score panel */}
          <div className="w-80 shrink-0 sticky top-24">

            {/* Circle + label */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">ATS Match Score</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                  <svg width="80" height="80" className="-rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="32"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 - (animatedScore / 100) * 2 * Math.PI * 32}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1.2s ease" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-lg font-bold text-slate-800">{cv.matchScore}</span>
                    <span className="text-[9px] text-slate-400">/ 100</span>
                  </div>
                </div>
                <div>
                  <div className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold ${scoreBg}`}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: scoreColor }}></span>
                    {scoreLabel}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {cv.matchScore >= 80
                      ? "Your CV is well-positioned for this role."
                      : cv.matchScore >= 60
                      ? "A few more tweaks could strengthen this."
                      : "Consider revisiting your experience framing."}
                  </p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {bd && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Score Breakdown</p>
                <div className="space-y-5">
                  <ScoreBar label="Keywords Match" before={bd.keywordsBefore} after={bd.keywordsMatch} weight={30} />
                  <ScoreBar label="Skills Alignment" before={bd.skillsBefore} after={bd.skillsAlignment} weight={25} />
                  <ScoreBar label="Experience Relevance" before={bd.experienceBefore} after={bd.experienceRelevance} weight={10} />
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}