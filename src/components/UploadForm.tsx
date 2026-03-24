"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function UploadForm() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const cvRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cvDragging, setCvDragging] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    const err = sessionStorage.getItem("tailorError");
    if (err === "SIGN_IN_REQUIRED") {
      sessionStorage.removeItem("tailorError");
      signInWithGoogle();
    } else if (err === "NO_CREDITS" || err === "LIMIT_REACHED") {
      setLimitReached(true);
      sessionStorage.removeItem("tailorError");
    } else if (err) {
      setError(err);
      sessionStorage.removeItem("tailorError");
    }

    const upgraded = new URLSearchParams(window.location.search).get("upgraded");
    if (upgraded === "true") setUpgradeSuccess(true);
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
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!cvFile || !jobDesc.trim()) {
      setError("Please upload your CV and paste the job description.");
      return;
    }
    setError("");
    setLimitReached(false);
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
        <Link href="/" className="flex items-center">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.ai</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
              <Link
                href="/account"
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
              >
                Account
              </Link>
              <Link
                href="/pricing"
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                Buy credits →
              </Link>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-400 transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in
            </button>
          )}
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
          >
            ← Back to home
          </Link>
          <span className="hidden sm:block text-xs text-slate-400 font-medium tracking-wide uppercase">Step 1 of 2</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Credits added success */}
        {upgradeSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Credits added! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Your tailor credits have been topped up.</p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="mb-10 sm:mb-12">
          <div
            className="inline-flex items-center gap-2 border text-xs font-medium px-3 py-1.5 rounded-full mb-5 sm:mb-6"
            style={{ backgroundColor: "#f0f4ff", borderColor: "#c7d2fe", color: "#0d1f3c" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0d1f3c" }}></span>
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

          {/* Credits counter for signed in users */}
          {user && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">Signed in as <span className="font-medium text-slate-700">{user.email}</span></p>
              <Link
                href="/pricing"
                className="text-xs font-semibold"
                style={{ color: "#0d1f3c" }}
              >
                Buy credits →
              </Link>
            </div>
          )}

          {/* Sign in prompt for guests */}
          {!user && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-0.5">Sign in to get started</p>
                <p className="text-xs text-slate-400">Free account includes 3 tailors — no credit card needed</p>
              </div>
              <button
                onClick={signInWithGoogle}
                className="shrink-0 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="rgba(255,255,255,0.9)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="rgba(255,255,255,0.9)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="rgba(255,255,255,0.9)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="rgba(255,255,255,0.9)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}

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

          {/* No credits prompt */}
          {limitReached && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-amber-800 mb-1">You've used all your tailor credits</p>
              <p className="text-xs text-amber-600 mb-3">Buy more credits to continue tailoring your CV. They never expire.</p>
              <button
                onClick={() => router.push("/pricing")}
                className="w-full text-white font-semibold py-3 rounded-xl text-sm"
                style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
              >
                Buy credits →
              </button>
            </div>
          )}

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
          {!limitReached && (
            <button
              onClick={handleSubmit}
              disabled={loading || !cvFile || !jobDesc.trim()}
              className="w-full text-white font-semibold py-4 rounded-2xl transition-all duration-200 text-sm tracking-wide"
              style={{
                background: loading || !cvFile || !jobDesc.trim()
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                cursor: loading || !cvFile || !jobDesc.trim() ? "not-allowed" : "pointer",
              }}
            >
              {!user
                ? "Sign in to tailor my CV →"
                : loading
                ? "Preparing..."
                : "Tailor my CV →"}
            </button>
          )}

          <p className="text-center text-xs text-slate-400">
            Your data is never stored. Each session is private.
          </p>
        </div>
      </main>
    </div>
  );
}