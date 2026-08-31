"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canonicalizeCv } from "@/lib/cv/canonical";
import { analyzeHardRequirements } from "@/lib/cv/hardRequirements";
import type { ExtractionReport } from "@/lib/cv/types";
import type { OriginalCV } from "@/lib/types";

function fileFromBase64(base64: string, name: string, type: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

export default function ReviewSourcePage() {
  const router = useRouter();
  const [source, setSource] = useState<OriginalCV | null>(null);
  const [report, setReport] = useState<ExtractionReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.resolve();
      const stored = sessionStorage.getItem("pendingTailor");
      if (!stored) {
        router.push("/upload");
        return;
      }
      const pending = JSON.parse(stored) as {
        cvBase64?: string;
        cvName?: string;
        cvType?: string;
        jobDescription?: string;
        reviewedSource?: OriginalCV;
        extractionReport?: ExtractionReport;
      };
      if (cancelled) return;
      setJobDescription(pending.jobDescription || "");

      if (pending.reviewedSource) {
        setSource(pending.reviewedSource);
        setReport(pending.extractionReport ?? null);
        setLoading(false);
        return;
      }

      if (!pending.cvBase64 || !pending.cvName) {
        setError("Missing uploaded CV.");
        setLoading(false);
        return;
      }

      const file = fileFromBase64(pending.cvBase64, pending.cvName, pending.cvType || "application/pdf");
      const fd = new FormData();
      fd.append("cv", file);
      try {
        const res = await fetch("/api/extract-source", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Could not extract this CV.");
        if (cancelled) return;
        setSource(data.source);
        setReport(data.extractionReport);
        sessionStorage.setItem("pendingTailor", JSON.stringify({
          ...pending,
          reviewedSource: data.source,
          extractionReport: data.extractionReport,
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not extract this CV.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const updateContact = (field: keyof OriginalCV, value: string) => {
    if (!source) return;
    setSource({ ...source, [field]: value });
  };

  const removeCoursework = (educationIndex: number, courseIndex: number) => {
    if (!source) return;
    setSource({
      ...source,
      education: source.education.map((edu, i) =>
        i === educationIndex
          ? { ...edu, coursework: (edu.coursework || []).filter((_, j) => j !== courseIndex) }
          : edu,
      ),
    });
  };

  const hardRequirements = source && jobDescription
    ? analyzeHardRequirements(canonicalizeCv(source), jobDescription)
    : null;

  const continueToTailor = () => {
    if (!source) return;
    if (report?.requiresUserReview && !confirmed) return;
    const pending = JSON.parse(sessionStorage.getItem("pendingTailor") || "{}");
    sessionStorage.setItem("pendingTailor", JSON.stringify({
      ...pending,
      reviewedSource: source,
      extractionReport: report,
      extractionConfirmed: true,
      requestId: pending.requestId || crypto.randomUUID(),
    }));
    router.push("/loading-screen");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-slate-500">Extracting your CV so you can review it…</p>
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-red-600 mb-4">{error || "Nothing to review."}</p>
          <button onClick={() => router.push("/upload")} className="text-sm font-semibold text-slate-700 underline">
            Back to upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <span className="font-semibold text-slate-800 tracking-tight">Review source CV</span>
        <button onClick={() => router.push("/upload")} className="text-xs font-semibold text-slate-600">
          ← Back
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          This reviewed version becomes the factual source used for tailoring. Check contact details,
          experience, education, coursework, certifications, projects, skills and any extra sections
          before continuing. The job description is only used for alignment after you confirm.
        </p>

        {report?.warnings.length ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 mb-2">Please review these extraction warnings</p>
            <ul className="list-disc pl-5 text-xs text-amber-700 space-y-1">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hardRequirements?.education.status === "needs_verification" ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800 mb-1">Hard requirement needs verification</p>
            <p className="text-xs text-slate-600">
              Job requires {hardRequirements.education.requirement}. Source evidence: {hardRequirements.education.candidateEvidence}.
              This is not changed to look eligible.
            </p>
          </div>
        ) : null}

        <section className="mb-6 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact</h2>
          {(["name", "email", "phone", "location", "linkedin"] as const).map((field) => (
            <input
              key={field}
              value={String(source[field] ?? "")}
              onChange={(e) => updateContact(field, e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              placeholder={field}
            />
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</h2>
          {(source.experience || []).map((job) => (
            <div key={job.id || job.title} className="mb-3 text-sm">
              <p className="font-bold text-slate-900">{job.title} · {job.company}</p>
              <p className="text-xs text-slate-400">{job.dates}</p>
              <ul className="mt-1 list-disc pl-5 text-slate-600">
                {job.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Education</h2>
          {(source.education || []).map((edu) => (
            <div key={edu.id || edu.degree} className="mb-3 text-sm">
              <p className="font-bold text-slate-900">{edu.degree}</p>
              <p className="text-xs italic text-slate-500">{edu.institution} · {edu.dates}</p>
              {edu.coursework?.length ? (
                <ul className="mt-1 space-y-1">
                  {edu.coursework.map((course, ci) => (
                    <li key={`${edu.id || edu.degree}-${ci}`} className="flex items-start justify-between gap-2 text-xs text-slate-600">
                      <span>{course}</span>
                      <button
                        type="button"
                        onClick={() => removeCoursework(source.education.indexOf(edu), ci)}
                        className="shrink-0 text-[10px] font-semibold text-slate-500 underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>

        {(source.certifications || []).length > 0 && (
          <section className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Certifications</h2>
            {source.certifications!.map((cert) => (
              <p key={cert.id || cert.name} className="text-sm text-slate-700">{cert.name} · {cert.issuer} · {cert.date}</p>
            ))}
          </section>
        )}

        {(source.projects || []).length > 0 && (
          <section className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Projects</h2>
            {source.projects!.map((project) => (
              <p key={project.id || project.name} className="text-sm text-slate-700 mb-1">{project.name}: {project.description}</p>
            ))}
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Skills</h2>
          {(source.skills || []).map((group) => (
            <p key={group.id || group.category} className="text-sm text-slate-700">
              <span className="font-bold">{group.category}: </span>{group.skills.join(", ")}
            </p>
          ))}
        </section>

        {(source.customSections || []).map((section) => (
          <section key={section.id} className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{section.title}</h2>
            <ul className="list-disc pl-5 text-sm text-slate-700">
              {section.items.map((item) => <li key={item.id}>{item.text}</li>)}
            </ul>
          </section>
        ))}

        {report?.requiresUserReview ? (
          <label className="flex items-start gap-2 mb-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            I have reviewed this extraction and confirm it is the complete source CV for tailoring.
          </label>
        ) : null}

        <button
          onClick={continueToTailor}
          disabled={Boolean(report?.requiresUserReview && !confirmed)}
          className="w-full text-white font-semibold py-3 rounded-xl text-sm disabled:bg-slate-300"
          style={{ backgroundColor: report?.requiresUserReview && !confirmed ? undefined : "#0d1f3c" }}
        >
          Confirm source and tailor
        </button>
        {jobDescription ? (
          <p className="text-xs text-slate-400 mt-3">The job description you pasted will be used only after this confirmation.</p>
        ) : null}
      </main>
    </div>
  );
}
