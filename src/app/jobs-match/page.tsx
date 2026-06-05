"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TailoredCV } from "@/lib/types";
import JobMatches from "@/components/JobMatches";

export default function JobsMatchPage() {
  const router = useRouter();
  const [cv, setCV] = useState<TailoredCV | null>(null);

  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("tailoredCV");
    if (!stored) { router.push("/upload"); return; }
    setCV(JSON.parse(stored));
    setJobDescription(sessionStorage.getItem("jobDescription") || "");
  }, [router]);

  if (!cv) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-1">
          <span className="font-semibold text-slate-800 tracking-tight">my</span>
          <img src="/favicon.ico" alt="myCVtailor.co.za" className="w-5 h-5" />
          <span className="font-semibold text-slate-800 tracking-tight">tailor.co.za</span>
        </Link>
        <button
          onClick={() => router.push("/upload")}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium"
        >
          ← Back
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl text-slate-900 leading-tight mb-3"
            style={{ color: "#0d1f3c" }}
          >
            Jobs you qualify for
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Based on <span className="font-semibold text-slate-700">{cv.name}</span>'s CV — real listings ranked by match.
          </p>
        </div>

        <JobMatches cv={cv} jobDescription={jobDescription} />

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/upload")}
            className="flex-1 text-sm font-semibold py-3 rounded-xl border transition-all hover:bg-slate-50"
            style={{ borderColor: "#0d1f3c", color: "#0d1f3c" }}
          >
            ← Tailor CV for a specific job
          </button>
        </div>
      </main>
    </div>
  );
}
