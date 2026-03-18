"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TailoredCV, OriginalCV } from "@/lib/types";
import { downloadPDF } from "@/lib/generatePDF";

function EditableText({
  value,
  onChange,
  className,
  editing,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  editing: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editing) return <span className={className}>{value}</span>;

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} border border-indigo-400 outline-none bg-white rounded-lg px-2 py-1 w-full shadow-sm focus:ring-2 focus:ring-indigo-300`}
    />
  );
}

function EditableTextarea({
  value,
  onChange,
  className,
  editing,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  editing: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing]);

  if (!editing) return <p className={className}>{value}</p>;

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
      }}
      className={`${className} border border-indigo-400 outline-none bg-white rounded-lg px-3 py-2 w-full resize-none shadow-sm focus:ring-2 focus:ring-indigo-300`}
      rows={3}
    />
  );
}

function EditBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0"
      style={{
        backgroundColor: active ? "#0d1f3c" : "transparent",
        color: active ? "white" : "#94a3b8",
        borderColor: active ? "#0d1f3c" : "#e2e8f0",
      }}
    >
      {active ? "Done" : "Edit"}
    </button>
  );
}

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
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
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

function OriginalCVCard({ cv }: { cv: OriginalCV }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="px-10 py-8 text-center" style={{ backgroundColor: "#64748b" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-white mb-2 tracking-tight">{cv.name}</h1>
        <p className="text-sm text-slate-200">{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ")}</p>
      </div>
      <div className="px-10 py-8 font-serif">
        {cv.summary && (
          <div className="mb-7">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Summary</h2>
            <div className="h-px bg-slate-200 mb-3" />
            <p className="text-sm text-slate-700 leading-relaxed">{cv.summary}</p>
          </div>
        )}
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
  );
}

function TailoredCVCard({
  cv,
  onChange,
}: {
  cv: TailoredCV;
  onChange: (updated: TailoredCV) => void;
}) {
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const toggle = (section: string) =>
    setEditingSection(prev => prev === section ? null : section);

  const updateSummary = (v: string) => onChange({ ...cv, summary: v });

  const updateBullet = (jobIdx: number, bulletIdx: number, v: string) => {
    const exp = cv.experience.map((job, i) =>
      i === jobIdx
        ? { ...job, bullets: job.bullets.map((b, j) => j === bulletIdx ? v : b) }
        : job
    );
    onChange({ ...cv, experience: exp });
  };

  const updateJobTitle = (jobIdx: number, v: string) => {
    const exp = cv.experience.map((job, i) => i === jobIdx ? { ...job, title: v } : job);
    onChange({ ...cv, experience: exp });
  };

  const updateJobCompany = (jobIdx: number, v: string) => {
    const exp = cv.experience.map((job, i) => i === jobIdx ? { ...job, company: v } : job);
    onChange({ ...cv, experience: exp });
  };

  const updateSkill = (groupIdx: number, skillIdx: number, v: string) => {
    const skills = cv.skills.map((g, i) =>
      i === groupIdx
        ? { ...g, skills: g.skills.map((s, j) => j === skillIdx ? v : s) }
        : g
    );
    onChange({ ...cv, skills });
  };

  const updateCoursework = (eduIdx: number, cwIdx: number, v: string) => {
    const education = cv.education.map((edu, i) =>
      i === eduIdx
        ? { ...edu, coursework: (edu.coursework || []).map((c, j) => j === cwIdx ? v : c) }
        : edu
    );
    onChange({ ...cv, education });
  };

  const isEditing = (section: string) => editingSection === section;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

      <div className="px-10 py-8 text-center" style={{ backgroundColor: "#0d1f3c" }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl text-white mb-2 tracking-tight">{cv.name}</h1>
        <p className="text-sm text-blue-200">
          {[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ")}
        </p>
      </div>

      <div className="bg-blue-50 border-b border-blue-100 px-10 py-2 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <p className="text-xs text-blue-500 font-medium">Click <span className="font-bold">Edit</span> next to any section to make changes before downloading.</p>
      </div>

      <div className="px-10 py-8 font-serif">

        {/* Summary */}
        {cv.summary && (
          <div className="mb-7">
            <div className="flex items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</h2>
              <EditBtn active={isEditing("summary")} onClick={() => toggle("summary")} />
            </div>
            <div className="h-px bg-slate-200 mb-3" />
            <EditableTextarea
              value={cv.summary}
              onChange={updateSummary}
              editing={isEditing("summary")}
              className="text-sm text-slate-700 leading-relaxed"
            />
          </div>
        )}

        {/* Key Skills */}
        {cv.skills?.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Key Skills</h2>
              <EditBtn active={isEditing("skills")} onClick={() => toggle("skills")} />
            </div>
            <div className="h-px bg-slate-200 mb-3" />
            <div className="space-y-3">
              {cv.skills.map((group, i) => (
                <div key={i} className="text-sm">
                  <span className="font-bold text-slate-800 block mb-1.5">{group.category}:</span>
                  {isEditing("skills") ? (
                    <div className="flex flex-wrap gap-2">
                      {group.skills.map((skill, j) => (
                        <input
                          key={j}
                          value={skill}
                          onChange={(e) => updateSkill(i, j, e.target.value)}
                          className="text-sm border border-indigo-400 outline-none bg-white rounded-lg px-3 py-1.5 text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-300"
                          style={{ width: `${Math.max(skill.length + 2, 10)}ch` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-600">{group.skills.join(", ")}</span>
                  )}
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
              {cv.experience.map((job, i) => {
                const sectionKey = `job-${i}`;
                const editing = isEditing(sectionKey);
                return (
                  <div key={i}>
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex items-center gap-1 flex-1">
                        <EditableText
                          value={job.title}
                          onChange={(v) => updateJobTitle(i, v)}
                          editing={editing}
                          className="text-sm font-bold text-slate-900"
                        />
                        <EditBtn active={editing} onClick={() => toggle(sectionKey)} />
                      </div>
                      <p className="text-xs italic text-slate-400 whitespace-nowrap ml-4">{job.dates}</p>
                    </div>
                    <EditableText
                      value={job.company}
                      onChange={(v) => updateJobCompany(i, v)}
                      editing={editing}
                      className="text-sm italic text-slate-500 mb-2 block"
                    />
                    <ul className="space-y-2 mt-2">
                      {job.bullets.map((b, j) => (
                        <li key={j} className="text-sm text-slate-600 flex gap-2">
                          <span className="shrink-0 text-slate-300 mt-0.5">•</span>
                          <EditableTextarea
                            value={b}
                            onChange={(v) => updateBullet(i, j, v)}
                            editing={editing}
                            className="text-sm text-slate-600 leading-relaxed"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Education */}
        {cv.education?.length > 0 && (
          <div className="mb-7">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Education</h2>
            <div className="h-px bg-slate-200 mb-3" />
            <div className="space-y-4">
              {cv.education.map((edu, i) => {
                const sectionKey = `edu-${i}`;
                const editing = isEditing(sectionKey);
                return (
                  <div key={i}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-slate-900">{edu.degree}</p>
                        <EditBtn active={editing} onClick={() => toggle(sectionKey)} />
                      </div>
                      <p className="text-xs italic text-slate-400">{edu.dates}</p>
                    </div>
                    <p className="text-sm italic text-slate-500 mb-1">{edu.institution}</p>
                    {edu.coursework && edu.coursework.length > 0 && (
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold not-italic text-slate-600">Relevant coursework: </span>
                        {editing ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {edu.coursework.map((c, j) => (
                              <input
                                key={j}
                                value={c}
                                onChange={(e) => updateCoursework(i, j, e.target.value)}
                                className="text-xs border border-indigo-400 outline-none bg-white rounded-lg px-3 py-1.5 text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-300"
                                style={{ width: `${Math.max(c.length + 2, 10)}ch` }}
                              />
                            ))}
                          </div>
                        ) : (
                          edu.coursework.join(", ")
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState<"tailored" | "original" | "compare">("tailored");

  useEffect(() => {
    const stored = sessionStorage.getItem("tailoredCV");
    if (!stored) { router.push("/"); return; }
    const parsed = JSON.parse(stored);
    setCV(parsed);
    const timeout = setTimeout(() => setAnimatedScore(parsed.matchScore), 300);
    return () => clearTimeout(timeout);
  }, [router]);

  const handleCVChange = (updated: TailoredCV) => {
    setCV(updated);
    sessionStorage.setItem("tailoredCV", JSON.stringify(updated));
  };

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

  const circumference = 2 * Math.PI * 32;
  const bd = cv.scoreBreakdown;

  const handleDownload = async () => {
    setDownloading(true);
    await downloadPDF(cv);
    setDownloading(false);
  };

  const tabs = [
    { id: "tailored", label: "Tailored" },
    { id: "original", label: "Original" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

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

        {/* Tabs + actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as typeof view)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: view === tab.id ? "#0d1f3c" : "transparent",
                  color: view === tab.id ? "white" : "#94a3b8",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/cover-letter")}
              className="font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 text-sm border"
              style={{ borderColor: "#0d1f3c", color: "#0d1f3c" }}
            >
              Cover Letter →
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center gap-2"
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
                  Generating...
                </>
              ) : "Download PDF →"}
            </button>
          </div>
        </div>

        {/* Compare view */}
        {view === "compare" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Original</p>
              {cv.originalCV
                ? <OriginalCVCard cv={cv.originalCV} />
                : <p className="text-sm text-slate-400 p-6">Original not available.</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Tailored</p>
              <TailoredCVCard cv={cv} onChange={handleCVChange} />
            </div>
          </div>
        )}

        {/* Single view */}
        {view !== "compare" && (
          <div className="flex gap-8 items-start">
            <div className="flex-1 min-w-0">
              {view === "tailored" && (
                <TailoredCVCard cv={cv} onChange={handleCVChange} />
              )}
              {view === "original" && (
                cv.originalCV
                  ? <OriginalCVCard cv={cv.originalCV} />
                  : <p className="text-sm text-slate-400 p-6">Original not available.</p>
              )}
              <div className="flex justify-start">
                <button
                  onClick={() => router.push("/")}
                  className="text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium"
                >
                  ← Tailor another CV
                </button>
              </div>
            </div>

            {/* Score panel */}
            <div className="w-80 shrink-0 sticky top-24">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">ATS Match Score</p>
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                    <svg width="80" height="80" className="-rotate-90">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (animatedScore / 100) * circumference}
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
        )}
      </main>
    </div>
  );
}