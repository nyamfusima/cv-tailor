"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const cvRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvDragging, setCvDragging] = useState(false);

  const handleCvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCvDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".docx"))) {
      setCvFile(file);
    } else {
      setError("Please upload a PDF or DOCX file.");
    }
  };

  const handleSubmit = async () => {
  if (!cvFile || !jobDesc.trim()) {
    setError("Please upload your CV and paste the job description.");
    return;
  }
  setError("");
  setLoading(true);

  const formData = new FormData();
  formData.append("cv", cvFile);
  formData.append("jobDescription", jobDesc);

  try {
    const res = await fetch("/api/tailor", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    sessionStorage.setItem("tailoredCV", JSON.stringify(data));
    router.push("/results");
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

    // MOCK — remove this block and uncomment the fetch below when API is ready
    await new Promise((r) => setTimeout(r, 1500));
    sessionStorage.setItem("tailoredCV", JSON.stringify({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+27 82 555 0123",
      location: "Cape Town, SA",
      linkedin: "linkedin.com/in/janesmith",
      summary: "Results-driven software engineer with 5 years of experience building scalable web applications, specialising in React and Node.js.",
      experience: [
        {
          title: "Senior Frontend Engineer",
          company: "Acme Corp",
          dates: "2021 – Present",
          bullets: [
            "Led migration of legacy codebase to Next.js, reducing load time by 40%",
            "Built reusable component library used across 3 product teams",
            "Mentored 2 junior developers"
          ]
        },
        {
          title: "Frontend Developer",
          company: "Startup XYZ",
          dates: "2019 – 2021",
          bullets: [
            "Developed customer-facing dashboard with React and TypeScript",
            "Integrated REST APIs and managed state with Redux"
          ]
        }
      ],
      education: [
        { degree: "BSc Computer Science", institution: "UCT", dates: "2015 – 2019" }
      ],
      skills: ["React", "Next.js", "TypeScript", "Node.js", "REST APIs", "Git", "Tailwind CSS"],
      matchScore: 87
    }));
    router.push("/results");
    setLoading(false);

    // REAL API — uncomment this when ready
    // const formData = new FormData();
    // formData.append("cv", cvFile);
    // formData.append("jobDescription", jobDesc);
    // try {
    //   const res = await fetch("/api/tailor", { method: "POST", body: formData });
    //   const data = await res.json();
    //   if (!res.ok) throw new Error(data.error || "Something went wrong");
    //   sessionStorage.setItem("tailoredCV", JSON.stringify(data));
    //   router.push("/results");
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setLoading(false);
    // }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold">CV</div>
          <span className="text-sm font-medium tracking-wide text-neutral-200">TailorCV</span>
        </div>
        <span className="text-xs text-neutral-500">Step 1 of 3 — Upload</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight mb-3">
            Tailor your CV to the job
          </h1>
          <p className="text-neutral-400 text-base">
            Upload your CV and paste the job description. Our AI rewrites your CV to match the role and pass ATS filters.
          </p>
        </div>

        <div className="space-y-6">
          {/* CV Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Your CV
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setCvDragging(true); }}
              onDragLeave={() => setCvDragging(false)}
              onDrop={handleCvDrop}
              onClick={() => cvRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                ${cvDragging ? "border-indigo-400 bg-indigo-500/10" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900"}
                ${cvFile ? "border-indigo-500 bg-indigo-500/5" : ""}
              `}
            >
              <input
                ref={cvRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => e.target.files && setCvFile(e.target.files[0])}
              />
              {cvFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-indigo-300">{cvFile.name}</p>
                    <p className="text-xs text-neutral-500">{(cvFile.size / 1024).toFixed(1)} KB · Click to replace</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-300 mb-1">Drop your CV here or <span className="text-indigo-400 underline">browse</span></p>
                  <p className="text-xs text-neutral-600">PDF or DOCX · Max 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Job description
            </label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here — the more detail, the better the tailoring..."
              rows={10}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
            />
            <p className="text-xs text-neutral-600 mt-1">{jobDesc.length} characters</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !cvFile || !jobDesc.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-medium py-3.5 rounded-xl transition-all duration-200 text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Tailoring your CV...
              </span>
            ) : "Tailor my CV →"}
          </button>
        </div>
      </main>
    </div>
  );
}