"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { id: 1, label: "Parsing your CV", detail: "Extracting text from your uploaded file..." },
  { id: 2, label: "Analysing job description", detail: "Identifying key requirements, skills and keywords..." },
  { id: 3, label: "Tailoring your CV", detail: "Rewriting and optimising for ATS..." },
  { id: 4, label: "Scoring your match", detail: "Calculating keyword alignment and relevance..." },
];

export default function LoadingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Check if there's a pending form submission
    const formData = sessionStorage.getItem("pendingTailor");
    if (!formData) { router.push("/"); return; }

    const { cvBase64, cvName, cvType, jobDescription } = JSON.parse(formData);

    // Step through the UI while the real API call runs in background
    const stepTimings = [800, 2000, 5000]; // when to advance to step 1, 2, 3
    const timers: NodeJS.Timeout[] = [];

    stepTimings.forEach((delay, i) => {
      timers.push(setTimeout(() => setCurrentStep(i + 1), delay));
    });

    // Rebuild the File from base64 and call the API
    async function run() {
      try {
        const byteString = atob(cvBase64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: cvType });
        const file = new File([blob], cvName, { type: cvType });

        const fd = new FormData();
        fd.append("cv", file);
        fd.append("jobDescription", jobDescription);

        const res = await fetch("/api/tailor", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Something went wrong");

        // Advance to step 4 before finishing
        setCurrentStep(3);
        await new Promise(r => setTimeout(r, 800));
        setCurrentStep(4);
        await new Promise(r => setTimeout(r, 600));

        setDone(true);
        sessionStorage.removeItem("pendingTailor");
        sessionStorage.setItem("tailoredCV", JSON.stringify(data));
        sessionStorage.setItem("jobDescription", jobDescription);

        await new Promise(r => setTimeout(r, 400));
        router.push("/results");
      } catch (err: any) {
        sessionStorage.setItem("tailorError", err.message);
        router.push("/");
      }
    }

    run();

    return () => timers.forEach(clearTimeout);
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-16">
        <img src="/favicon.ico" alt="TailorCV" className="w-7 h-7" />
        <span className="font-semibold text-slate-800 tracking-tight">TailorCV</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-12">
        <h2
          style={{ fontFamily: "'DM Serif Display', serif" }}
          className="text-3xl text-slate-900 mb-2"
        >
          {done ? "Your CV is ready." : "Working on your CV..."}
        </h2>
        <p className="text-sm text-slate-400">
          {done ? "Redirecting you now..." : "This usually takes 15–30 seconds."}
        </p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-4">
        {steps.map((step, i) => {
          const isComplete = currentStep > i;
          const isActive = currentStep === i;
          const isPending = currentStep < i;

          return (
            <div
              key={step.id}
              className="flex items-start gap-4 transition-all duration-500"
              style={{ opacity: isPending ? 0.3 : 1 }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-500"
                style={{
                  backgroundColor: isComplete ? "#10b981" : isActive ? "#e2e8f0" : "#f1f5f9",
                  border: isActive ? "2px solid #ececec" : "2px solid transparent",
                }}
              >
                {isComplete ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <svg className="animate-spin w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>

              {/* Text */}
              <div className="pt-1">
                <p
                  className="text-sm font-semibold transition-colors duration-300"
                  style={{ color: isComplete ? "#0d1f3c" : isActive ? "#1e293b" : "#94a3b8" }}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-slate-400 mt-0.5 animate-pulse">{step.detail}</p>
                )}
                {isComplete && (
                  <p className="text-xs text-emerald-500 mt-0.5">Complete</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mt-10">
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(currentStep / steps.length) * 100}%`,
              backgroundColor: done ? "#10b981" : "#10b981",
            }}
          />
        </div>
        <p className="text-xs text-slate-400 text-right mt-1.5">
          {done ? "100%" : `${Math.round((currentStep / steps.length) * 100)}%`}
        </p>
      </div>
    </div>
  );
}