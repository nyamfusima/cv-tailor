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

const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean, traditional layout. Safe for any industry.",
    accent: "#1a1a1a",
    preview: "border-l-4 border-neutral-800",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Two-column layout with a bold header.",
    accent: "#4f46e5",
    preview: "border-l-4 border-indigo-500",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Pure whitespace. Lets the content breathe.",
    accent: "#0f766e",
    preview: "border-l-4 border-teal-600",
  },
  {
    id: "sharp",
    name: "Sharp",
    description: "High contrast. Great for tech and creative roles.",
    accent: "#dc2626",
    preview: "border-l-4 border-red-600",
  },
];

function ClassicTemplate({ cv }: { cv: TailoredCV }) {
  return (
    <div className="bg-white text-neutral-900 p-8 text-[11px] leading-relaxed font-sans h-full">
      <div className="border-b-2 border-neutral-900 pb-3 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-widest">{cv.name}</h1>
        <p className="text-neutral-500 mt-1">{cv.email} · {cv.phone} · {cv.location}</p>
      </div>
      {cv.summary && <p className="mb-4 text-neutral-700">{cv.summary}</p>}
      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Experience</p>
      {cv.experience?.slice(0, 2).map((job, i) => (
        <div key={i} className="mb-3">
          <div className="flex justify-between">
            <p className="font-semibold">{job.title} — {job.company}</p>
            <p className="text-neutral-400">{job.dates}</p>
          </div>
          <ul className="mt-1 space-y-0.5">
            {job.bullets.slice(0, 2).map((b, j) => (
              <li key={j} className="text-neutral-600">· {b}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-2 mt-4">Skills</p>
      <p className="text-neutral-600">{cv.skills?.join(", ")}</p>
    </div>
  );
}

function ModernTemplate({ cv }: { cv: TailoredCV }) {
  return (
    <div className="bg-white text-neutral-900 text-[11px] leading-relaxed font-sans h-full flex">
      <div className="w-1/3 bg-indigo-600 text-white p-5">
        <p className="text-[9px] uppercase tracking-widest opacity-70 mb-1">Contact</p>
        <p className="mb-0.5">{cv.email}</p>
        <p className="mb-0.5">{cv.phone}</p>
        <p className="mb-4">{cv.location}</p>
        <p className="text-[9px] uppercase tracking-widest opacity-70 mb-2">Skills</p>
        {cv.skills?.map((s, i) => (
          <p key={i} className="mb-0.5 opacity-90">{s}</p>
        ))}
      </div>
      <div className="flex-1 p-5">
        <h1 className="text-lg font-bold text-indigo-600 mb-1">{cv.name}</h1>
        {cv.summary && <p className="text-neutral-500 mb-4 text-[10px]">{cv.summary}</p>}
        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Experience</p>
        {cv.experience?.slice(0, 2).map((job, i) => (
          <div key={i} className="mb-3">
            <p className="font-semibold">{job.title}</p>
            <p className="text-indigo-400">{job.company} · {job.dates}</p>
            <ul className="mt-1">
              {job.bullets.slice(0, 2).map((b, j) => (
                <li key={j} className="text-neutral-600">· {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function MinimalTemplate({ cv }: { cv: TailoredCV }) {
  return (
    <div className="bg-white text-neutral-900 p-8 text-[11px] leading-relaxed font-sans h-full">
      <h1 className="text-2xl font-light tracking-tight mb-1">{cv.name}</h1>
      <p className="text-neutral-400 mb-6">{cv.email} · {cv.phone} · {cv.location}</p>
      {cv.summary && <p className="mb-6 text-neutral-600 font-light">{cv.summary}</p>}
      {cv.experience?.slice(0, 2).map((job, i) => (
        <div key={i} className="mb-4 flex gap-4">
          <p className="text-neutral-300 w-16 shrink-0 text-right">{job.dates.split("–")[0]}</p>
          <div>
            <p className="font-medium">{job.title}, <span className="font-light text-neutral-500">{job.company}</span></p>
            <ul className="mt-1 space-y-0.5">
              {job.bullets.slice(0, 2).map((b, j) => (
                <li key={j} className="text-neutral-500">{b}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function SharpTemplate({ cv }: { cv: TailoredCV }) {
  return (
    <div className="bg-neutral-950 text-white p-8 text-[11px] leading-relaxed font-sans h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">{cv.name}</h1>
        <p className="text-red-500 text-[10px] mt-0.5">{cv.email} · {cv.phone} · {cv.location}</p>
      </div>
      {cv.summary && <p className="mb-5 text-neutral-400">{cv.summary}</p>}
      <p className="text-[9px] font-bold uppercase tracking-widest text-red-500 mb-3">Experience</p>
      {cv.experience?.slice(0, 2).map((job, i) => (
        <div key={i} className="mb-3 border-l border-neutral-700 pl-3">
          <div className="flex justify-between">
            <p className="font-semibold text-white">{job.title}</p>
            <p className="text-neutral-500">{job.dates}</p>
          </div>
          <p className="text-red-400 mb-1">{job.company}</p>
          {job.bullets.slice(0, 2).map((b, j) => (
            <p key={j} className="text-neutral-400">· {b}</p>
          ))}
        </div>
      ))}
      <p className="text-[9px] font-bold uppercase tracking-widest text-red-500 mb-2 mt-4">Skills</p>
      <div className="flex flex-wrap gap-1">
        {cv.skills?.map((s, i) => (
          <span key={i} className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded text-[9px]">{s}</span>
        ))}
      </div>
    </div>
  );
}

const templateComponents: Record<string, React.ComponentType<{ cv: TailoredCV }>> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  sharp: SharpTemplate,
};

export default function TemplatesPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);
  const [selected, setSelected] = useState("classic");

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

  const SelectedPreview = templateComponents[selected];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-5 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold">CV</div>
          <span className="text-sm font-medium text-neutral-200">TailorCV</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500">Step 3 of 3 — Choose template</span>
          <button onClick={() => router.back()} className="text-xs text-neutral-400 hover:text-white transition-colors">
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Choose your template</h1>
          <p className="text-neutral-400 text-sm">Your tailored CV will be applied to the selected template. Download as PDF when ready.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template thumbnails */}
          <div className="space-y-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                  ${selected === t.id
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-10 rounded-full`} style={{ backgroundColor: t.accent }} />
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{t.name}</p>
                    <p className="text-xs text-neutral-500">{t.description}</p>
                  </div>
                  {selected === t.id && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}

            <button
              onClick={() => alert("PDF export coming in Step 6!")}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors text-sm mt-4"
            >
              Download PDF →
            </button>
          </div>

          {/* Live preview */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl" style={{ height: "680px" }}>
              <SelectedPreview cv={cv} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}