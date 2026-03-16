"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Experience {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

interface Education {
  degree: string;
  institution: string;
  dates: string;
}

interface TailoredCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  matchScore: number;
}

export default function ResultsPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("tailoredCV");
    if (!stored) { router.push("/"); return; }
    setCV(JSON.parse(stored));
  }, [router]);

  if (!cv) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <p className="text-neutral-500 text-sm">Loading...</p>
    </div>
  );

  const scoreColor =
    cv.matchScore >= 80 ? "text-emerald-400" :
    cv.matchScore >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-5 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold">CV</div>
          <span className="text-sm font-medium text-neutral-200">TailorCV</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500">Step 2 of 3 — Review</span>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            ← Start over
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Match score */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400 mb-1">ATS match score</p>
            <p className={`text-4xl font-semibold ${scoreColor}`}>{cv.matchScore}<span className="text-xl text-neutral-500">%</span></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-400 mb-1">Ready to apply?</p>
            <p className="text-sm text-neutral-200">
              {cv.matchScore >= 80 ? "Strong match — go for it" :
               cv.matchScore >= 60 ? "Good match — review before applying" :
               "Weak match — consider more tailoring"}
            </p>
          </div>
        </div>

        {/* CV Preview */}
        <div className="bg-white text-neutral-900 rounded-2xl p-10 shadow-xl">
          {/* Contact */}
          <div className="border-b border-neutral-200 pb-6 mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">{cv.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>{cv.phone}</span>}
              {cv.location && <span>{cv.location}</span>}
              {cv.linkedin && <span>{cv.linkedin}</span>}
            </div>
          </div>

          {/* Summary */}
          {cv.summary && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">Summary</h2>
              <p className="text-sm text-neutral-700 leading-relaxed">{cv.summary}</p>
            </div>
          )}

          {/* Experience */}
          {cv.experience?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Experience</h2>
              <div className="space-y-5">
                {cv.experience.map((job, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{job.title}</p>
                        <p className="text-sm text-neutral-500">{job.company}</p>
                      </div>
                      <p className="text-xs text-neutral-400 whitespace-nowrap ml-4">{job.dates}</p>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {job.bullets.map((b, j) => (
                        <li key={j} className="text-sm text-neutral-700 flex gap-2">
                          <span className="text-neutral-400 mt-0.5 shrink-0">·</span>
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
            <div className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Education</h2>
              <div className="space-y-2">
                {cv.education.map((edu, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{edu.degree}</p>
                      <p className="text-sm text-neutral-500">{edu.institution}</p>
                    </div>
                    <p className="text-xs text-neutral-400">{edu.dates}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {cv.skills?.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {cv.skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next step */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => router.push("/templates")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Choose a template →
          </button>
        </div>
      </main>
    </div>
  );
}