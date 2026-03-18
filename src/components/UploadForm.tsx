"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const cvRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvDragging, setCvDragging] = useState(false);

  useEffect(() => {
    const err = sessionStorage.getItem("tailorError");
    if (err) {
      setError(err);
      sessionStorage.removeItem("tailorError");
    }
  }, []);

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

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      sessionStorage.setItem("pendingTailor", JSON.stringify({
        cvBase64: base64,
        cvName: cvFile.name,
        cvType: cvFile.type,
        jobDescription: jobDesc,
      }));
      router.push("/loading-screen");
    };
    reader.readAsDataURL(cvFile);
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.ico" alt="TailorCV" className="w-7 h-7" />
          <span className="font-semibold text-slate-800 tracking-tight">TailorCV</span>
        </div>
        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Step 1 of 2</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Hero */}
        <div className="mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-5 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            AI-powered · ATS optimised
          </div>
          <h1
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl text-slate-900 leading-tight mb-4"
          >
            Land more<br />interviews.
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Upload your CV and paste the job description. Our AI rewrites your CV to mirror the role's keywords and pass ATS filters.
          </p>
        </div>

        <div className="space-y-5">

          {/* CV Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setCvDragging(true); }}
            onDragLeave={() => setCvDragging(false)}
            onDrop={handleCvDrop}
            onClick={() => cvRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-6 sm:p-8 text-center"
            style={{
              borderColor: cvDragging ? "#2563eb" : cvFile ? "#0d1f3c" : "#cbd5e1",
              backgroundColor: cvDragging ? "#eff6ff" : cvFile ? "#f0f4ff" : "#ffffff",
            }}
          >
            <input
              ref={cvRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => e.target.files && setCvFile(e.target.files[0])}
            />
            {cvFile ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#0d1f3c" }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{cvFile.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(cvFile.size / 1024).toFixed(1)} KB · Click to replace</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Drop your CV here or <span className="underline" style={{ color: "#0d1f3c" }}>browse</span>
                </p>
                <p className="text-xs text-slate-400">PDF or DOCX · Max 10MB</p>
              </>
            )}
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-4 pb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Description</label>
              <span className="text-xs text-slate-300">{jobDesc.length} chars</span>
            </div>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here — the more detail, the better the tailoring..."
              rows={10}
              className="w-full px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !cvFile || !jobDesc.trim()}
            className="w-full text-white font-semibold py-4 rounded-2xl transition-all duration-200 text-sm tracking-wide"
            style={{
              backgroundColor: loading || !cvFile || !jobDesc.trim() ? "#94a3b8" : "#0d1f3c",
              cursor: loading || !cvFile || !jobDesc.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Preparing..." : "Tailor my CV →"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your data is never stored. Each session is private.
          </p>
        </div>
      </main>
    </div>
  );
}