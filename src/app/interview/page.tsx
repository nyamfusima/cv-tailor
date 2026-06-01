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

/* ─────────────────────────── Types ─────────────────────────── */

type Screen = "setup" | "interview" | "debrief";
export type InterviewStatus = "idle" | "speaking" | "listening" | "thinking";

export interface InterviewQuestion {
  id: number;
  question: string;
  type: "behavioural" | "technical" | "situational" | "motivation";
  good_answer_hints: string;
}

export interface InterviewPlan {
  cvText: string;
  jdText: string;
  jobTitle: string;
  questions: InterviewQuestion[];
}

export interface HistoryEntry {
  question: string;
  answer: string;
}

/* ─────────────────────────── Constants ─────────────────────── */

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

/* ─────────────────────────── Setup Screen ───────────────────── */

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
          <p className="mt-1.5 text-xs text-amber-600">
            Paste the full job description for the best results.
          </p>
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

/* ─────────────────────────── Status Indicator ───────────────── */

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

/* ─────────────────────────── Interview Screen ───────────────── */

interface InterviewScreenProps {
  plan: InterviewPlan;
  onEnd: (history: HistoryEntry[]) => void;
}

function InterviewScreen({ plan, onEnd }: InterviewScreenProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const total = plan.questions.length;
  const currentQ = plan.questions[questionIndex];
  const isLast = questionIndex === total - 1;

  /* Submit the current answer and advance */
  const submitAnswer = () => {
    const answer = transcript.trim() || "(no answer recorded)";
    const updatedHistory = [...history, { question: currentQ.question, answer }];
    setHistory(updatedHistory);
    setTranscript("");

    if (isLast) {
      onEnd(updatedHistory);
    } else {
      setQuestionIndex((i) => i + 1);
      setStatus("idle");
    }
  };

  /* End early */
  const endEarly = () => {
    const answer = transcript.trim();
    const updatedHistory = answer
      ? [...history, { question: currentQ.question, answer }]
      : history;
    onEnd(updatedHistory);
  };

  return (
    <div className="mx-auto max-w-2xl">

      {/* Top bar: progress + end button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#0D1F3C]">
            Question {questionIndex + 1} of {total}
          </span>
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {plan.questions.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < questionIndex
                    ? "w-4 bg-emerald-500"
                    : i === questionIndex
                    ? "w-4 bg-[#0D1F3C]"
                    : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={endEarly}
          className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all"
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
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[currentQ.type]}`}>
            {TYPE_LABEL[currentQ.type]}
          </span>
        </div>

        <p className="text-base font-medium leading-relaxed text-[#0D1F3C]">
          {currentQ.question}
        </p>
      </div>

      {/* Status */}
      <div className="mb-4 flex items-center gap-3">
        <StatusIndicator status={status} />
        {status === "idle" && (
          <span className="text-xs text-gray-400">
            Voice I/O connects in Stage 5 — type your answer below to test the flow
          </span>
        )}
      </div>

      {/* Transcript area */}
      <div className="mb-5 rounded-xl border border-black/8 bg-white shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
        <div className="border-b border-black/5 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Your answer
          </p>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your spoken answer will appear here once voice is connected (Stage 5). You can also type to test the flow…"
          rows={5}
          className="w-full resize-none rounded-b-xl bg-transparent px-4 py-3 text-sm text-[#0D1F3C] placeholder-gray-300 outline-none"
        />
      </div>

      {/* Submit answer */}
      <button
        onClick={submitAnswer}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1F3C] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#1a3a6b]"
      >
        {isLast ? (
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

      <p className="mt-2.5 text-center text-xs text-gray-400">
        {isLast
          ? "This is the last question — submitting will take you to your debrief"
          : `${total - questionIndex - 1} question${total - questionIndex - 1 === 1 ? "" : "s"} remaining`}
      </p>
    </div>
  );
}

/* ─────────────────────────── Debrief Placeholder ────────────── */

function DebriefPlaceholder({ history, onRestart }: { history: HistoryEntry[]; onRestart: () => void }) {
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

      {/* Transcript summary */}
      <div className="mb-6 rounded-xl border border-black/8 bg-white overflow-hidden shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
        <div className="border-b border-black/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Interview transcript ({history.length} Q&amp;As)
          </p>
        </div>
        {history.map((entry, i) => (
          <div key={i} className="border-b border-black/5 px-4 py-4 last:border-0">
            <p className="mb-1.5 text-xs font-semibold text-[#0D1F3C]">Q{i + 1}. {entry.question}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{entry.answer}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        className="rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#0D1F3C] hover:bg-gray-50 transition-colors"
      >
        Start new interview
      </button>
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────── */

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
      const { data } = await supabase
        .from("users")
        .select("job_credits")
        .eq("id", user.id)
        .single();
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

  const handlePlanReady = (interviewPlan: InterviewPlan) => {
    setPlan(interviewPlan);
    setScreen("interview");
  };

  const handleInterviewEnd = (completedHistory: HistoryEntry[]) => {
    setHistory(completedHistory);
    setScreen("debrief");
  };

  const handleRestart = () => {
    setPlan(null);
    setHistory([]);
    setScreen("setup");
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans">
      {/* Header */}
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my
          <Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />
          tailor.co.za
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
        {screen === "setup" && <SetupScreen onStart={handlePlanReady} />}
        {screen === "interview" && plan && (
          <InterviewScreen plan={plan} onEnd={handleInterviewEnd} />
        )}
        {screen === "debrief" && (
          <DebriefPlaceholder history={history} onRestart={handleRestart} />
        )}
      </main>
    </div>
  );
}
