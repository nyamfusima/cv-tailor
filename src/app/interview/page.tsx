"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  MicrophoneIcon,
  CheckCircleIcon,
  WarningIcon,
  ArrowRightIcon,
  FilePdfIcon,
  StopIcon,
  SpeakerHighIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import {
  useVoiceInterview,
  type InterviewPlan,
  type InterviewQuestion,
  type InterviewStatus,
  type HistoryEntry,
} from "@/hooks/useVoiceInterview";

/* ── Screen type ────────────────────────────────────────────── */

type Screen = "setup" | "interview" | "debrief";

/* ── UI constants ───────────────────────────────────────────── */

const TYPE_LABEL: Record<InterviewQuestion["type"], string> = {
  behavioural: "Behavioural",
  technical: "Technical",
  situational: "Situational",
  motivation: "Motivation",
};
const TYPE_COLOR: Record<InterviewQuestion["type"], string> = {
  behavioural: "bg-blue-50 text-blue-700",
  technical: "bg-purple-50 text-purple-700",
  situational: "bg-amber-50 text-amber-700",
  motivation: "bg-emerald-50 text-emerald-700",
};

/* ── Setup Screen ───────────────────────────────────────────── */

function SetupScreen({ onStart }: { onStart: (plan: InterviewPlan) => void }) {
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvName, setCvName] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvError, setCvError] = useState<string | null>(null);
  const [jdText, setJdText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCV() {
      try {
        const urlRes = await fetch("/api/master-cv-url");
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || "No master CV found.");

        const blob = await fetch(urlData.url).then((r) => {
          if (!r.ok) throw new Error("Failed to download CV.");
          return r.blob();
        });

        const fileName: string = urlData.name || "cv.pdf";
        const mimeType = fileName.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";
        const file = new File([blob], fileName, { type: mimeType });

        const form = new FormData();
        form.append("cv", file);
        const extractRes = await fetch("/api/extract-cv-text", { method: "POST", body: form });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || "Failed to read CV.");

        setCvText(extractData.text as string);
        setCvName(fileName);
      } catch (err) {
        setCvError(err instanceof Error ? err.message : "Failed to load CV.");
      } finally {
        setCvLoading(false);
      }
    }
    void loadCV();
  }, []);

  const jdValid = jdText.trim().length >= 50;
  const canStart = !!cvText && jdValid && !generating;

  const handleStart = async () => {
    if (!canStart || !cvText) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/interview/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jdText, jobTitle: jobTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan.");
      onStart({
        cvText,
        jdText,
        jobTitle: jobTitle.trim() || "this role",
        questions: data.questions as InterviewQuestion[],
      });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7EFEB] text-stone-600">
          <MicrophoneIcon size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0D1F3C]">AI Voice Interviewer</h1>
          <p className="text-sm text-gray-400">Personalised to your CV and the role</p>
        </div>
      </div>

      {/* CV status */}
      <div className="mb-5 rounded-xl border border-black/8 bg-white p-4 shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Your CV</p>
        {cvLoading ? (
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
            Loading your CV…
          </div>
        ) : cvError ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-rose-600">
              <WarningIcon size={15} weight="fill" />
              {cvError}
            </div>
            <Link href="/dashboard" className="text-xs font-semibold text-[#0D1F3C] hover:underline">
              Upload CV on dashboard →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <FilePdfIcon size={16} weight="duotone" className="shrink-0 text-rose-500" />
            <span className="flex-1 truncate text-sm font-medium text-[#0D1F3C]">{cvName}</span>
            <CheckCircleIcon size={16} weight="fill" className="shrink-0 text-emerald-500" />
          </div>
        )}
      </div>

      {/* Job title */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-[#0D1F3C]">
          Job title <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Senior Product Manager"
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#0D1F3C] placeholder-gray-400 outline-none transition-all focus:border-[#0D1F3C]/30 focus:ring-2 focus:ring-[#0D1F3C]/8"
        />
      </div>

      {/* JD */}
      <div className="mb-6">
        <label className="mb-1.5 block text-sm font-medium text-[#0D1F3C]">
          Job description <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the full job description here…"
          rows={10}
          className="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#0D1F3C] placeholder-gray-400 outline-none transition-all focus:border-[#0D1F3C]/30 focus:ring-2 focus:ring-[#0D1F3C]/8"
        />
        {jdText.trim().length > 0 && !jdValid && (
          <p className="mt-1.5 text-xs text-amber-600">Paste the full job description for the best results.</p>
        )}
      </div>

      {generateError && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{generateError}</div>
      )}

      <button
        onClick={() => void handleStart()}
        disabled={!canStart}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1F3C] px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? (
          <>
            <CircleNotchIcon size={16} className="animate-spin" />
            Preparing your interview…
          </>
        ) : (
          <>
            Start Interview
            <ArrowRightIcon size={16} weight="bold" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-gray-400">
        The AI will generate 6 personalised questions from your CV and the JD
      </p>
    </div>
  );
}

/* ── Status Indicator ───────────────────────────────────────── */

function StatusIndicator({ status }: { status: InterviewStatus }) {
  const config: Record<InterviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle: {
      label: "Ready",
      color: "bg-slate-100 text-slate-500",
      icon: <MicrophoneIcon size={14} weight="duotone" />,
    },
    speaking: {
      label: "AI is speaking…",
      color: "bg-blue-50 text-blue-600",
      icon: <SpeakerHighIcon size={14} weight="fill" className="animate-pulse" />,
    },
    listening: {
      label: "Listening…",
      color: "bg-rose-50 text-rose-600",
      icon: (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
      ),
    },
    thinking: {
      label: "AI is thinking…",
      color: "bg-amber-50 text-amber-600",
      icon: <CircleNotchIcon size={14} className="animate-spin" />,
    },
  };

  const { label, color, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {icon}
      {label}
    </span>
  );
}

/* ── Interview Screen ───────────────────────────────────────── */

function InterviewScreen({
  plan,
  onEnd,
}: {
  plan: InterviewPlan;
  onEnd: (history: HistoryEntry[]) => void;
}) {
  const {
    status,
    currentQuestion,
    planIndex,
    transcript,
    supported,
    isActive,
    start,
    stop,
    submitManual,
  } = useVoiceInterview(plan, onEnd);

  const [manualInput, setManualInput] = useState("");
  const total = plan.questions.length;

  /* ── Pre-start screen ── */
  if (!isActive) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DDF3EC] text-emerald-700">
            <MicrophoneIcon size={24} weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0D1F3C]">Ready to begin</h1>
            <p className="text-sm text-gray-400">
              {total} questions · {plan.jobTitle}
            </p>
          </div>
        </div>

        {/* First question preview */}
        <div className="mb-6 rounded-2xl border border-black/8 bg-white p-6 shadow-[0_8px_32px_rgba(13,31,60,0.06)]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">First question</p>
          <p className="text-base font-medium leading-relaxed text-[#0D1F3C]">{currentQuestion}</p>
        </div>

        {!supported && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <WarningIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              Voice input isn&apos;t supported in this browser. You&apos;ll type your answers instead.
              Chrome or Edge recommended for full voice experience.
            </span>
          </div>
        )}

        <button
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1F3C] px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6b]"
        >
          <MicrophoneIcon size={16} weight="fill" />
          Begin Interview
        </button>
        <p className="mt-3 text-center text-xs text-gray-400">
          The AI will speak each question aloud, then listen for your answer
        </p>
      </div>
    );
  }

  /* ── Active interview ── */
  const currentPlanQ = plan.questions[planIndex];

  return (
    <div className="mx-auto max-w-2xl">

      {/* Progress bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#0D1F3C]">
            Question {planIndex + 1} of {total}
          </span>
          <div className="flex items-center gap-1">
            {plan.questions.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < planIndex
                    ? "w-4 bg-emerald-500"
                    : i === planIndex
                    ? "w-4 bg-[#0D1F3C]"
                    : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={stop}
          className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-rose-200 hover:text-rose-600"
        >
          <StopIcon size={12} weight="fill" />
          End early
        </button>
      </div>

      {/* Interviewer card */}
      <div className="mb-4 rounded-2xl border border-black/8 bg-white p-6 shadow-[0_8px_32px_rgba(13,31,60,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D1F3C] text-white">
              <MicrophoneIcon size={14} weight="duotone" />
            </div>
            <span className="text-xs font-semibold text-[#0D1F3C]">Interviewer</span>
          </div>
          {currentPlanQ && (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[currentPlanQ.type]}`}>
              {TYPE_LABEL[currentPlanQ.type]}
            </span>
          )}
        </div>
        <p className="text-base font-medium leading-relaxed text-[#0D1F3C]">
          {currentQuestion}
        </p>
      </div>

      {/* Status */}
      <div className="mb-4">
        <StatusIndicator status={status} />
      </div>

      {/* Transcript / answer area */}
      <div className="mb-5 rounded-xl border border-black/8 bg-white shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
        <div className="border-b border-black/5 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Your answer</p>
        </div>

        {supported ? (
          /* Live transcript from STT */
          <div className="min-h-[120px] px-4 py-3">
            {transcript ? (
              <p className="text-sm text-[#0D1F3C] leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-sm text-gray-300">
                {status === "listening"
                  ? "Speak now — your answer will appear here…"
                  : "Your answer will appear here when you speak."}
              </p>
            )}
          </div>
        ) : (
          /* Text fallback for unsupported browsers */
          <div className="px-4 py-3">
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Type your answer here…"
              rows={4}
              className="w-full resize-none bg-transparent text-sm text-[#0D1F3C] placeholder-gray-300 outline-none"
            />
          </div>
        )}
      </div>

      {/* Submit — only shown in fallback mode or when STT is idle */}
      {!supported && (
        <button
          onClick={() => {
            submitManual(manualInput);
            setManualInput("");
          }}
          disabled={!manualInput.trim() || status === "thinking"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1F3C] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "thinking" ? (
            <>
              <CircleNotchIcon size={16} className="animate-spin" />
              AI is thinking…
            </>
          ) : planIndex >= total - 1 ? (
            <>
              Finish Interview
              <CheckCircleIcon size={16} weight="bold" />
            </>
          ) : (
            <>
              Submit Answer
              <ArrowRightIcon size={16} weight="bold" />
            </>
          )}
        </button>
      )}

      <p className="mt-3 text-center text-xs text-gray-400">
        {supported
          ? status === "listening"
            ? "Speak your answer — the AI will listen until you pause"
            : "The AI will automatically start listening after it finishes speaking"
          : `${total - planIndex - 1} question${total - planIndex - 1 === 1 ? "" : "s"} remaining`}
      </p>
    </div>
  );
}

/* ── Debrief Placeholder ────────────────────────────────────── */

function DebriefPlaceholder({
  history,
  onRestart,
}: {
  history: HistoryEntry[];
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DDF3EC] text-emerald-700">
          <CheckCircleIcon size={24} weight="duotone" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0D1F3C]">Interview complete</h1>
          <p className="text-sm text-gray-400">Debrief and scoring coming in Stage 7</p>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
        <div className="border-b border-black/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Interview transcript ({history.length} Q&amp;As)
          </p>
        </div>
        {history.map((entry, i) => (
          <div key={i} className="border-b border-black/5 px-4 py-4 last:border-0">
            <p className="mb-1.5 text-xs font-semibold text-[#0D1F3C]">Q{i + 1}. {entry.question}</p>
            <p className="text-sm leading-relaxed text-gray-500">{entry.answer}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#0D1F3C] transition-colors hover:bg-gray-50"
      >
        Start new interview
      </button>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */

export default function InterviewPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("setup");
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    async function checkPro() {
      if (!user) return;
      const { data } = await supabase.from("users").select("job_credits").eq("id", user.id).single();
      if ((data?.job_credits ?? 0) <= 0) { router.push("/pricing"); return; }
      setIsPro(true);
    }
    void checkPro();
  }, [user, loading, router]);

  if (loading || isPro === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-400 text-sm font-sans">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans">
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my<Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />tailor.co.za
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-[#0D1F3C] transition-colors">
            Dashboard
          </Link>
          <button onClick={() => void signOut()} className="text-xs text-slate-500 hover:text-[#0D1F3C] transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {screen === "setup" && (
          <SetupScreen
            onStart={(p) => { setPlan(p); setScreen("interview"); }}
          />
        )}
        {screen === "interview" && plan && (
          <InterviewScreen
            plan={plan}
            onEnd={(h) => { setHistory(h); setScreen("debrief"); }}
          />
        )}
        {screen === "debrief" && (
          <DebriefPlaceholder
            history={history}
            onRestart={() => { setPlan(null); setHistory([]); setScreen("setup"); }}
          />
        )}
      </main>
    </div>
  );
}
