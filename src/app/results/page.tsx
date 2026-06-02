"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TailoredCV, OriginalCV } from "@/lib/types";
import { downloadPDF } from "@/lib/generatePDF";

function EditableText({
  value, onChange, className, editing,
}: {
  value: string; onChange: (v: string) => void; className?: string; editing: boolean;
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
  value, onChange, className, editing,
}: {
  value: string; onChange: (v: string) => void; className?: string; editing: boolean;
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

function DangerBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0"
      style={{
        backgroundColor: "#fef2f2",
        color: "#b91c1c",
        borderColor: "#fecaca",
      }}
    >
      {label}
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
        <div className="absolute h-full rounded-full bg-slate-300 transition-all duration-700 ease-out" style={{ width: animated ? `${before}%` : "0%" }} />
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

function CVSections({ cv }: { cv: OriginalCV }) {
  return (
    <div className="px-6 sm:px-10 py-8 font-serif">
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
              <div key={i} className="flex gap-2 text-sm flex-wrap">
                <span className="font-bold text-slate-800 shrink-0 min-w-[100px]">{group.category}:</span>
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-0.5 gap-0.5">
                  <p className="text-sm font-bold text-slate-900">{job.title}</p>
                  <p className="text-xs italic text-slate-400 sm:whitespace-nowrap sm:ml-4">{job.dates}</p>
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5">
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
        <div className="mb-7">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Professional Development</h2>
          <div className="h-px bg-slate-200 mb-3" />
          <div className="space-y-3">
            {cv.certifications.map((cert, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5">
                <div>
                  <p className="text-sm font-bold text-slate-900">{cert.name}</p>
                  <p className="text-xs italic text-slate-500">{cert.issuer}</p>
                </div>
                <p className="text-xs italic text-slate-400 sm:whitespace-nowrap sm:ml-4">{cert.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {cv.projects && cv.projects.length > 0 && (
        <div className="mb-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Projects</h2>
          <div className="h-px bg-slate-200 mb-3" />
          <div className="space-y-4">
            {cv.projects.map((project, i) => (
              <div key={i}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5 mb-0.5">
                  <p className="text-sm font-bold text-slate-900">{project.name}</p>
                  {project.dates && <p className="text-xs italic text-slate-400 sm:whitespace-nowrap sm:ml-4">{project.dates}</p>}
                </div>
                {project.url && <p className="text-xs text-blue-500 mb-1">{project.url}</p>}
                <p className="text-sm text-slate-600">{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold not-italic text-slate-600">Technologies: </span>
                    {project.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OriginalCVCard({ cv }: { cv: OriginalCV }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="px-6 sm:px-10 py-8 text-center" style={{ backgroundColor: "#64748b" }}>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">{cv.name}</h1>
        <p className="text-xs sm:text-sm text-slate-200 break-words">{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ")}</p>
      </div>
      <CVSections cv={cv} />
    </div>
  );
}

function TailoredCVCard({ cv, onChange }: { cv: TailoredCV; onChange: (updated: TailoredCV) => void }) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const toggle = (key: string) => setEditingSection(prev => prev === key ? null : key);
  const isEditing = (key: string) => editingSection === key;
  const closeEdit = () => setEditingSection(null);

  // ── Contact
  const updateContact = (field: "name" | "email" | "phone" | "location" | "linkedin", v: string) =>
    onChange({ ...cv, [field]: v });

  // ── Summary
  const updateSummary = (v: string) => onChange({ ...cv, summary: v });

  // ── Skills
  const updateSkillCategory = (gi: number, v: string) =>
    onChange({ ...cv, skills: cv.skills.map((g, i) => i === gi ? { ...g, category: v } : g) });
  const updateSkill = (gi: number, si: number, v: string) =>
    onChange({ ...cv, skills: cv.skills.map((g, i) => i === gi ? { ...g, skills: g.skills.map((s, j) => j === si ? v : s) } : g) });
  const deleteSkill = (gi: number, si: number) =>
    onChange({ ...cv, skills: cv.skills.map((g, i) => i === gi ? { ...g, skills: g.skills.filter((_, j) => j !== si) } : g) });
  const addSkill = (gi: number) =>
    onChange({ ...cv, skills: cv.skills.map((g, i) => i === gi ? { ...g, skills: [...g.skills, "New skill"] } : g) });
  const deleteSkillGroup = (gi: number) =>
    onChange({ ...cv, skills: cv.skills.filter((_, i) => i !== gi) });
  const addSkillGroup = () =>
    onChange({ ...cv, skills: [...(cv.skills || []), { category: "New Category", skills: ["New skill"] }] });

  // ── Experience
  const updateJobField = (ji: number, field: "title" | "company" | "dates", v: string) =>
    onChange({ ...cv, experience: cv.experience.map((job, i) => i === ji ? { ...job, [field]: v } : job) });
  const updateBullet = (ji: number, bi: number, v: string) =>
    onChange({ ...cv, experience: cv.experience.map((job, i) => i === ji ? { ...job, bullets: job.bullets.map((b, j) => j === bi ? v : b) } : job) });
  const deleteBullet = (ji: number, bi: number) =>
    onChange({ ...cv, experience: cv.experience.map((job, i) => i === ji ? { ...job, bullets: job.bullets.filter((_, j) => j !== bi) } : job) });
  const addBullet = (ji: number) =>
    onChange({ ...cv, experience: cv.experience.map((job, i) => i === ji ? { ...job, bullets: [...job.bullets, "Describe an achievement or responsibility"] } : job) });
  const deleteExperience = (ji: number) =>
    onChange({ ...cv, experience: cv.experience.filter((_, i) => i !== ji) });
  const addExperience = () =>
    onChange({ ...cv, experience: [...(cv.experience || []), { title: "Job Title", company: "Company Name", dates: "2023 – Present", bullets: ["Key achievement"] }] });

  // ── Education
  const updateEduField = (ei: number, field: "degree" | "institution" | "dates", v: string) =>
    onChange({ ...cv, education: cv.education.map((edu, i) => i === ei ? { ...edu, [field]: v } : edu) });
  const updateCoursework = (ei: number, ci: number, v: string) =>
    onChange({ ...cv, education: cv.education.map((edu, i) => i === ei ? { ...edu, coursework: (edu.coursework || []).map((c, j) => j === ci ? v : c) } : edu) });
  const deleteCoursework = (ei: number, ci: number) =>
    onChange({ ...cv, education: cv.education.map((edu, i) => i === ei ? { ...edu, coursework: (edu.coursework || []).filter((_, j) => j !== ci) } : edu) });
  const addCoursework = (ei: number) =>
    onChange({ ...cv, education: cv.education.map((edu, i) => i === ei ? { ...edu, coursework: [...(edu.coursework || []), "Course name"] } : edu) });
  const deleteEducation = (ei: number) =>
    onChange({ ...cv, education: cv.education.filter((_, i) => i !== ei) });
  const addEducation = () =>
    onChange({ ...cv, education: [...(cv.education || []), { degree: "Degree / Qualification", institution: "Institution", dates: "2020 – 2024", coursework: [] }] });

  // ── Certifications
  const certs = cv.certifications || [];
  const updateCertField = (ci: number, field: "name" | "issuer" | "date", v: string) =>
    onChange({ ...cv, certifications: certs.map((c, i) => i === ci ? { ...c, [field]: v } : c) });
  const deleteCertification = (ci: number) =>
    onChange({ ...cv, certifications: certs.filter((_, i) => i !== ci) });
  const addCertification = () =>
    onChange({ ...cv, certifications: [...certs, { name: "Certification Name", issuer: "Issuer", date: String(new Date().getFullYear()) }] });

  // ── Projects
  const projects = cv.projects || [];
  const updateProjectField = (pi: number, field: "name" | "description" | "url" | "dates", v: string) =>
    onChange({ ...cv, projects: projects.map((p, i) => i === pi ? { ...p, [field]: v } : p) });
  const updateProjectTech = (pi: number, ti: number, v: string) =>
    onChange({ ...cv, projects: projects.map((p, i) => i === pi ? { ...p, technologies: (p.technologies || []).map((t, j) => j === ti ? v : t) } : p) });
  const deleteProjectTech = (pi: number, ti: number) =>
    onChange({ ...cv, projects: projects.map((p, i) => i === pi ? { ...p, technologies: (p.technologies || []).filter((_, j) => j !== ti) } : p) });
  const addProjectTech = (pi: number) =>
    onChange({ ...cv, projects: projects.map((p, i) => i === pi ? { ...p, technologies: [...(p.technologies || []), "Technology"] } : p) });
  const deleteProject = (pi: number) =>
    onChange({ ...cv, projects: projects.filter((_, i) => i !== pi) });
  const addProject = () =>
    onChange({ ...cv, projects: [...projects, { name: "Project Name", description: "Brief description of what you built and its impact.", technologies: [], url: "", dates: "" }] });

  // ── References
  const refs = cv.references || [];
  const updateRefField = (ri: number, field: "name" | "title" | "company" | "email" | "phone", v: string) =>
    onChange({ ...cv, references: refs.map((r, i) => i === ri ? { ...r, [field]: v } : r) });
  const deleteReference = (ri: number) =>
    onChange({ ...cv, references: refs.filter((_, i) => i !== ri) });
  const addReference = () =>
    onChange({ ...cv, references: [...refs, { name: "Referee Name", title: "Job Title", company: "Company", email: "", phone: "" }] });
  const removeReferencesSection = () =>
    onChange({ ...cv, references: undefined });

  const [showAddSection, setShowAddSection] = useState(false);

  const addBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="mt-3 text-xs font-semibold text-slate-400 border border-dashed border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 hover:text-slate-600 transition-colors"
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

      {/* ── Header with inline contact editing ── */}
      <div className="relative px-6 sm:px-10 py-8 text-center" style={{ backgroundColor: "#0d1f3c" }}>
        {isEditing("contact") ? (
          <div className="space-y-3 max-w-sm mx-auto text-left">
            <input
              value={cv.name}
              onChange={e => updateContact("name", e.target.value)}
              placeholder="Full name"
              className="text-lg font-bold text-center w-full bg-white/10 text-white border border-white/30 rounded-xl px-3 py-2 outline-none focus:bg-white/20 placeholder-white/30"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["email", "phone", "location", "linkedin"] as const).map(f => (
                <input
                  key={f}
                  value={cv[f] || ""}
                  onChange={e => updateContact(f, e.target.value)}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  className="text-xs bg-white/10 text-white border border-white/30 rounded-lg px-2 py-1.5 outline-none focus:bg-white/20 placeholder-white/30 w-full"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 tracking-tight">{cv.name}</h1>
            <p className="text-xs sm:text-sm text-blue-200 break-words">{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ")}</p>
          </>
        )}
        <button
          onClick={() => toggle("contact")}
          className="absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
          style={{
            backgroundColor: isEditing("contact") ? "white" : "rgba(255,255,255,0.12)",
            color: isEditing("contact") ? "#0d1f3c" : "rgba(255,255,255,0.75)",
            borderColor: isEditing("contact") ? "white" : "rgba(255,255,255,0.25)",
          }}
        >
          {isEditing("contact") ? "Done" : "Edit"}
        </button>
      </div>

      {/* ── Hint banner ── */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 sm:px-10 py-2 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <p className="text-xs text-blue-500 font-medium">Click <span className="font-bold">Edit</span> next to any section to make changes.</p>
      </div>

      <div className="px-6 sm:px-10 py-8 font-serif">

        {/* ── Summary ── */}
        <div className="mb-7">
          <div className="flex items-center mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</h2>
            <EditBtn active={isEditing("summary")} onClick={() => toggle("summary")} />
          </div>
          <div className="h-px bg-slate-200 mb-3" />
          <EditableTextarea value={cv.summary || ""} onChange={updateSummary} editing={isEditing("summary")} className="text-sm text-slate-700 leading-relaxed" />
        </div>

        {/* ── Skills ── */}
        <div className="mb-7">
          <div className="flex items-center mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Key Skills</h2>
            <EditBtn active={isEditing("skills")} onClick={() => toggle("skills")} />
          </div>
          <div className="h-px bg-slate-200 mb-3" />
          <div className="space-y-3">
            {(cv.skills || []).map((group, gi) => (
              <div key={gi} className="text-sm">
                {isEditing("skills") ? (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={group.category}
                        onChange={e => updateSkillCategory(gi, e.target.value)}
                        className="text-sm font-bold text-slate-800 border border-indigo-300 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-200 bg-white flex-1 min-w-0"
                      />
                      <span className="text-slate-400 shrink-0">:</span>
                      <button
                        onClick={() => deleteSkillGroup(gi)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                        style={{ backgroundColor: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.skills.map((skill, si) => (
                        <div key={si} className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden">
                          <input
                            value={skill}
                            onChange={e => updateSkill(gi, si, e.target.value)}
                            className="text-sm px-2 py-1 outline-none focus:bg-indigo-50/60 text-slate-700"
                            style={{ width: `${Math.max(skill.length + 1, 6)}ch` }}
                          />
                          <button
                            onClick={() => deleteSkill(gi, si)}
                            className="px-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none self-stretch flex items-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addSkill(gi)}
                        className="text-xs font-semibold text-indigo-500 border border-dashed border-indigo-300 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors"
                      >
                        + skill
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 shrink-0 min-w-[100px]">{group.category}:</span>
                    <span className="text-slate-600">{group.skills.join(", ")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isEditing("skills") && (
            <button
              onClick={addSkillGroup}
              className="mt-3 text-xs font-semibold text-indigo-500 border border-dashed border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
            >
              + Add category
            </button>
          )}
        </div>

        {/* ── Experience ── */}
        <div className="mb-7">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</h2>
          <div className="h-px bg-slate-200 mb-3" />
          <div className="space-y-6">
            {(cv.experience || []).map((job, ji) => {
              const key = `job-${ji}`;
              const editing = isEditing(key);
              return (
                <div key={ji} className={editing ? "border border-indigo-200 rounded-xl p-4 -mx-1 bg-slate-50/50" : ""}>
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <EditableText value={job.title} onChange={v => updateJobField(ji, "title", v)} editing={editing} className="text-sm font-bold text-slate-900" />
                      <EditBtn active={editing} onClick={() => toggle(key)} />
                      {editing && <DangerBtn onClick={() => { closeEdit(); deleteExperience(ji); }} label="Delete" />}
                    </div>
                    {editing ? (
                      <input
                        value={job.dates}
                        onChange={e => updateJobField(ji, "dates", e.target.value)}
                        placeholder="e.g. Jan 2022 – Mar 2024"
                        className="text-xs italic text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white shrink-0"
                        style={{ width: "11rem" }}
                      />
                    ) : (
                      <span className="text-xs italic text-slate-400 whitespace-nowrap shrink-0">{job.dates}</span>
                    )}
                  </div>
                  <EditableText value={job.company} onChange={v => updateJobField(ji, "company", v)} editing={editing} className="text-sm italic text-slate-500 mb-2 block" />
                  <ul className="space-y-2 mt-1">
                    {job.bullets.map((b, bi) => (
                      <li key={bi} className="text-sm text-slate-600 flex gap-2 items-start">
                        <span className="shrink-0 text-slate-300 mt-1 leading-none">•</span>
                        <EditableTextarea value={b} onChange={v => updateBullet(ji, bi, v)} editing={editing} className="text-sm text-slate-600 leading-relaxed flex-1" />
                        {editing && (
                          <button onClick={() => deleteBullet(ji, bi)} className="shrink-0 text-slate-300 hover:text-red-400 transition-colors text-xl leading-none mt-0.5">×</button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editing && (
                    <button
                      onClick={() => addBullet(ji)}
                      className="mt-3 text-xs font-semibold text-indigo-500 border border-dashed border-indigo-300 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                    >
                      + Add bullet
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {addBtn("+ Add experience", addExperience)}
        </div>

        {/* ── Education ── */}
        <div className="mb-7">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Education</h2>
          <div className="h-px bg-slate-200 mb-3" />
          <div className="space-y-4">
            {(cv.education || []).map((edu, ei) => {
              const key = `edu-${ei}`;
              const editing = isEditing(key);
              return (
                <div key={ei} className={editing ? "border border-indigo-200 rounded-xl p-4 -mx-1 bg-slate-50/50" : ""}>
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <EditableText value={edu.degree} onChange={v => updateEduField(ei, "degree", v)} editing={editing} className="text-sm font-bold text-slate-900" />
                      <EditBtn active={editing} onClick={() => toggle(key)} />
                      {editing && <DangerBtn onClick={() => { closeEdit(); deleteEducation(ei); }} label="Delete" />}
                    </div>
                    {editing ? (
                      <input
                        value={edu.dates}
                        onChange={e => updateEduField(ei, "dates", e.target.value)}
                        placeholder="e.g. 2019 – 2023"
                        className="text-xs italic text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white shrink-0"
                        style={{ width: "9rem" }}
                      />
                    ) : (
                      <span className="text-xs italic text-slate-400 whitespace-nowrap shrink-0">{edu.dates}</span>
                    )}
                  </div>
                  <EditableText value={edu.institution} onChange={v => updateEduField(ei, "institution", v)} editing={editing} className="text-sm italic text-slate-500 mb-1 block" />
                  {(edu.coursework && edu.coursework.length > 0 || editing) && (
                    <div className="text-xs text-slate-500 mt-1.5">
                      <span className="font-semibold not-italic text-slate-600">Relevant coursework: </span>
                      {editing ? (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(edu.coursework || []).map((c, ci) => (
                            <div key={ci} className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden">
                              <input
                                value={c}
                                onChange={e => updateCoursework(ei, ci, e.target.value)}
                                className="text-xs px-2 py-1 outline-none text-slate-700"
                                style={{ width: `${Math.max(c.length + 1, 8)}ch` }}
                              />
                              <button onClick={() => deleteCoursework(ei, ci)} className="px-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors self-stretch flex items-center">×</button>
                            </div>
                          ))}
                          <button
                            onClick={() => addCoursework(ei)}
                            className="text-xs font-semibold text-indigo-500 border border-dashed border-indigo-300 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors"
                          >
                            + course
                          </button>
                        </div>
                      ) : edu.coursework?.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {addBtn("+ Add education", addEducation)}
        </div>

        {/* ── Certifications ── */}
        <div className="mb-7">
          {certs.length > 0 && (
            <>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Professional Development</h2>
              <div className="h-px bg-slate-200 mb-3" />
              <div className="space-y-3">
                {certs.map((cert, ci) => {
                  const key = `cert-${ci}`;
                  const editing = isEditing(key);
                  return (
                    <div key={ci}>
                      {editing ? (
                        <div className="border border-indigo-200 rounded-xl p-4 -mx-1 bg-slate-50/50 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={cert.name}
                              onChange={e => updateCertField(ci, "name", e.target.value)}
                              placeholder="Certification name"
                              className="flex-1 text-sm font-bold text-slate-900 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white min-w-0"
                            />
                            <input
                              value={cert.date}
                              onChange={e => updateCertField(ci, "date", e.target.value)}
                              placeholder="Year"
                              className="w-20 text-xs text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white shrink-0"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              value={cert.issuer}
                              onChange={e => updateCertField(ci, "issuer", e.target.value)}
                              placeholder="Issuer / Organisation"
                              className="flex-1 text-xs italic text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white min-w-0"
                            />
                            <EditBtn active={true} onClick={() => closeEdit()} />
                            <DangerBtn onClick={() => { closeEdit(); deleteCertification(ci); }} label="Delete" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold text-slate-900">{cert.name}</p>
                              <EditBtn active={false} onClick={() => toggle(key)} />
                            </div>
                            <p className="text-xs italic text-slate-500">{cert.issuer}</p>
                          </div>
                          <p className="text-xs italic text-slate-400 sm:whitespace-nowrap sm:ml-4">{cert.date}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {addBtn("+ Add certification", addCertification)}
        </div>

        {/* ── Projects ── */}
        <div className="mb-7">
          {projects.length > 0 && (
            <>
              <div className="flex items-center mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Projects</h2>
                <EditBtn active={isEditing("projects")} onClick={() => toggle("projects")} />
              </div>
              <div className="h-px bg-slate-200 mb-3" />
              <div className="space-y-5">
                {projects.map((project, pi) => {
                  const editing = isEditing("projects");
                  return (
                    <div key={pi} className={editing ? "border border-indigo-200 rounded-xl p-4 -mx-1 bg-slate-50/50" : ""}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <EditableText value={project.name} onChange={v => updateProjectField(pi, "name", v)} editing={editing} className="text-sm font-bold text-slate-900" />
                          {editing && <DangerBtn onClick={() => deleteProject(pi)} label="Delete" />}
                        </div>
                        {editing ? (
                          <input
                            value={project.dates || ""}
                            onChange={e => updateProjectField(pi, "dates", e.target.value)}
                            placeholder="e.g. Jan 2024"
                            className="text-xs italic text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white shrink-0"
                            style={{ width: "9rem" }}
                          />
                        ) : (
                          project.dates && <span className="text-xs italic text-slate-400 whitespace-nowrap shrink-0">{project.dates}</span>
                        )}
                      </div>
                      {editing ? (
                        <input
                          value={project.url || ""}
                          onChange={e => updateProjectField(pi, "url", e.target.value)}
                          placeholder="URL (optional)"
                          className="text-xs text-blue-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white w-full mb-2"
                        />
                      ) : (
                        project.url && <p className="text-xs text-blue-500 mb-1">{project.url}</p>
                      )}
                      <EditableTextarea value={project.description} onChange={v => updateProjectField(pi, "description", v)} editing={editing} className="text-sm text-slate-600 leading-relaxed" />
                      {(project.technologies && project.technologies.length > 0 || editing) && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold not-italic text-slate-600">Technologies: </span>
                          {editing ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(project.technologies || []).map((t, ti) => (
                                <div key={ti} className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden">
                                  <input
                                    value={t}
                                    onChange={e => updateProjectTech(pi, ti, e.target.value)}
                                    className="text-xs px-2 py-1 outline-none text-slate-700"
                                    style={{ width: `${Math.max(t.length + 1, 6)}ch` }}
                                  />
                                  <button onClick={() => deleteProjectTech(pi, ti)} className="px-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors self-stretch flex items-center">×</button>
                                </div>
                              ))}
                              <button
                                onClick={() => addProjectTech(pi)}
                                className="text-xs font-semibold text-indigo-500 border border-dashed border-indigo-300 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors"
                              >
                                + tech
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">{project.technologies?.join(", ")}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {addBtn("+ Add project", addProject)}
        </div>

        {/* ── References ── */}
        {refs.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">References</h2>
              <button
                onClick={removeReferencesSection}
                className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                style={{ backgroundColor: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}
              >
                Remove section
              </button>
            </div>
            <div className="h-px bg-slate-200 mb-3" />
            <div className="space-y-4">
              {refs.map((ref, ri) => {
                const key = `ref-${ri}`;
                const editing = isEditing(key);
                return (
                  <div key={ri}>
                    {editing ? (
                      <div className="border border-indigo-200 rounded-xl p-4 -mx-1 bg-slate-50/50 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={ref.name}
                            onChange={e => updateRefField(ri, "name", e.target.value)}
                            placeholder="Referee name"
                            className="text-sm font-bold text-slate-900 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white col-span-2"
                          />
                          <input
                            value={ref.title}
                            onChange={e => updateRefField(ri, "title", e.target.value)}
                            placeholder="Job title"
                            className="text-xs text-slate-700 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                          />
                          <input
                            value={ref.company}
                            onChange={e => updateRefField(ri, "company", e.target.value)}
                            placeholder="Company"
                            className="text-xs text-slate-700 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                          />
                          <input
                            value={ref.email || ""}
                            onChange={e => updateRefField(ri, "email", e.target.value)}
                            placeholder="Email (optional)"
                            className="text-xs text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                          />
                          <input
                            value={ref.phone || ""}
                            onChange={e => updateRefField(ri, "phone", e.target.value)}
                            placeholder="Phone (optional)"
                            className="text-xs text-slate-500 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <EditBtn active={true} onClick={() => closeEdit()} />
                          <DangerBtn onClick={() => { closeEdit(); deleteReference(ri); }} label="Delete" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-bold text-slate-900">{ref.name}</p>
                            <EditBtn active={false} onClick={() => toggle(key)} />
                          </div>
                          <p className="text-xs text-slate-600">{ref.title} · {ref.company}</p>
                          {(ref.email || ref.phone) && (
                            <p className="text-xs text-slate-400 mt-0.5">{[ref.email, ref.phone].filter(Boolean).join("  ·  ")}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {addBtn("+ Add referee", addReference)}
          </div>
        )}

        {/* ── Add section ── */}
        <div className="relative mt-2">
          <button
            onClick={() => setShowAddSection(v => !v)}
            className="text-xs font-semibold text-slate-400 border border-dashed border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 hover:text-slate-600 transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Add section
          </button>
          {showAddSection && (
            <div className="absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[160px]">
              <button
                onClick={() => {
                  if (projects.length === 0) addProject();
                  setShowAddSection(false);
                }}
                disabled={projects.length > 0}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Projects
              </button>
              <button
                onClick={() => {
                  if (refs.length === 0) addReference();
                  setShowAddSection(false);
                }}
                disabled={refs.length > 0}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                References
              </button>
            </div>
          )}
        </div>

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
    if (!stored) { router.push("/upload"); return; }
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
    <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/favicon.ico" alt="TailorCV" className="w-7 h-7" />
          <span className="font-semibold text-slate-800 tracking-tight">TailorCV</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden sm:block text-xs text-slate-400 font-medium tracking-wide uppercase">Step 2 of 2</span>
          <button
            onClick={() => router.push("/upload")}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            ← Start over
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Tabs + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-full sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as typeof view)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: view === tab.id ? "#0d1f3c" : "transparent",
                  color: view === tab.id ? "white" : "#94a3b8",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/cover-letter")}
              className="flex-1 sm:flex-none font-semibold px-4 sm:px-6 py-2.5 rounded-xl transition-all duration-200 text-sm border text-center"
              style={{ borderColor: "#0d1f3c", color: "#0d1f3c" }}
            >
              Cover Letter →
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-none text-white font-semibold px-4 sm:px-6 py-2.5 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
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
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : "Download PDF →"}
            </button>
          </div>
        </div>

        {/* Score panel — shows on top on mobile */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">ATS Match Score</p>
            <div className="flex items-center gap-4">
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
                  {cv.matchScore >= 80 ? "Well-positioned for this role." : cv.matchScore >= 60 ? "A few tweaks could help." : "Consider revisiting your framing."}
                </p>
              </div>
            </div>
          </div>
          {bd && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Score Breakdown</p>
              <div className="space-y-4">
                <ScoreBar label="Keywords Match" before={bd.keywordsBefore} after={bd.keywordsMatch} weight={30} />
                <ScoreBar label="Skills Alignment" before={bd.skillsBefore} after={bd.skillsAlignment} weight={25} />
                <ScoreBar label="Experience Relevance" before={bd.experienceBefore} after={bd.experienceRelevance} weight={10} />
              </div>
            </div>
          )}
        </div>

        {/* Compare view — stacks on mobile */}
        {view === "compare" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* CV */}
            <div className="flex-1 min-w-0 w-full">
              {view === "tailored" && <TailoredCVCard cv={cv} onChange={handleCVChange} />}
              {view === "original" && (
                cv.originalCV
                  ? <OriginalCVCard cv={cv.originalCV} />
                  : <p className="text-sm text-slate-400 p-6">Original not available.</p>
              )}
              <div className="flex justify-start">
                <button
                  onClick={() => router.push("/")}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  ← Tailor another CV
                </button>
              </div>
            </div>

            {/* Score panel — desktop only, sticky */}
            <div className="hidden lg:block w-80 shrink-0 sticky top-24">
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
                      {cv.matchScore >= 80 ? "Your CV is well-positioned for this role." : cv.matchScore >= 60 ? "A few more tweaks could strengthen this." : "Consider revisiting your experience framing."}
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
