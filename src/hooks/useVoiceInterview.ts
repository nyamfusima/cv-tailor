import { useCallback, useEffect, useRef, useState } from "react";

/* ── Shared types ──────────────────────────────────────────────── */

export type InterviewStatus = "idle" | "speaking" | "listening" | "thinking";

export interface InterviewQuestion {
  id: number;
  question: string;
  type: "intro" | "behavioural" | "technical" | "situational" | "motivation";
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

export const INTERVIEW_DURATION_SECS = 10 * 60; // 10 minutes

export interface UseVoiceInterviewReturn {
  status: InterviewStatus;
  currentQuestion: string;
  planIndex: number;
  transcript: string;
  history: HistoryEntry[];
  supported: boolean;
  isActive: boolean;
  timeLeft: number;       // seconds remaining
  start: () => void;
  stop: () => void;
  stopListening: () => void;
  submitManual: (answer: string) => void;
}

/* ── Hook ──────────────────────────────────────────────────────── */

export function useVoiceInterview(
  plan: InterviewPlan,
  onComplete: (history: HistoryEntry[]) => void
): UseVoiceInterviewReturn {
  const [status, setStatus] = useState<InterviewStatus>("idle");
  const [planIndex, setPlanIndexState] = useState(0);
  const [currentQuestion, setCurrentQuestionState] = useState(
    plan.questions[0]?.question ?? ""
  );
  const [transcript, setTranscript] = useState("");
  const [history, setHistoryState] = useState<HistoryEntry[]>([]);
  const [supported, setSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);

  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECS);

  // Refs for values accessed inside async callbacks / event handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef("");
  const planIndexRef = useRef(0);
  const historyRef = useRef<HistoryEntry[]>([]);
  const currentQRef = useRef(plan.questions[0]?.question ?? "");
  const stoppedRef = useRef(false);
  // Forward ref breaks the circular dep: startListening → submitRef → handleAnswerSubmit
  const submitRef = useRef<((answer: string) => void) | null>(null);

  // Helpers: update both state (re-render) and ref (callbacks)
  const setPlanIndex = (n: number) => { planIndexRef.current = n; setPlanIndexState(n); };
  const setCurrentQuestion = (q: string) => { currentQRef.current = q; setCurrentQuestionState(q); };
  const setHistory = (h: HistoryEntry[]) => { historyRef.current = h; setHistoryState(h); };

  // Support check + cleanup
  useEffect(() => {
    // Reset so React Strict Mode's simulated unmount/remount doesn't permanently
    // leave stoppedRef = true before the user has interacted.
    stoppedRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
      audioRef.current = null;
      recognitionRef.current?.abort?.();
    };
  }, []);

  // ── TTS via ElevenLabs ────────────────────────────────────────
  const speak = useCallback(async (text: string): Promise<void> => {
    try {
      const res = await fetch("/api/interview/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return; // silently skip — don't block the interview

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        void audio.play().catch(() => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); });
      });
    } catch {
      // Don't block the interview on any TTS failure
    }
  }, []);

  // ── STT — continuous with 3s silence detection ────────────────
  const startListening = useCallback(() => {
    if (stoppedRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    recognitionRef.current = rec;
    finalTextRef.current = "";
    setTranscript("");
    setStatus("listening");

    rec.continuous = true;       // don't stop on short pauses
    rec.interimResults = true;
    rec.lang = "en-US";

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        // 3 s of silence after speech → auto-stop
        if (finalTextRef.current.trim().length > 0) rec.stop();
      }, 3000);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTextRef.current += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setTranscript(finalTextRef.current + interim);
      resetSilenceTimer();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (e.error === "aborted" || e.error === "no-speech") return;
      console.error("[STT]", e.error);
      submitRef.current?.(finalTextRef.current.trim());
    };

    rec.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (!stoppedRef.current) submitRef.current?.(finalTextRef.current.trim());
    };

    rec.start();
  }, []);

  // ── Core loop: answer → API → speak next ──────────────────────
  const handleAnswerSubmit = useCallback(async (answer: string) => {
    if (stoppedRef.current) return;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setStatus("thinking");
    setTranscript("");

    const newHistory: HistoryEntry[] = [
      ...historyRef.current,
      { question: currentQRef.current, answer: answer || "(no answer)" },
    ];
    setHistory(newHistory);

    try {
      const res = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText: plan.cvText,
          jdText: plan.jdText,
          jobTitle: plan.jobTitle,
          questionPlan: plan.questions,
          history: newHistory,
          currentQuestionIndex: planIndexRef.current,
          userAnswer: answer,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json() as {
        type: "next_question" | "followup" | "end";
        text: string;
      };
      if (stoppedRef.current) return;

      if (data.type === "next_question") setPlanIndex(planIndexRef.current + 1);
      setCurrentQuestion(data.text);
      setStatus("speaking");

      if (data.type === "end") {
        await speak(data.text);
        if (!stoppedRef.current) onComplete(newHistory);
        return;
      }

      await speak(data.text);
      if (!stoppedRef.current) startListening();
    } catch {
      if (stoppedRef.current) return;
      const next = planIndexRef.current + 1;
      if (next < plan.questions.length) {
        setPlanIndex(next);
        const nextQ = plan.questions[next].question;
        setCurrentQuestion(nextQ);
        setStatus("speaking");
        await speak(nextQ);
        if (!stoppedRef.current) startListening();
      } else {
        onComplete(newHistory);
      }
    }
  }, [plan, speak, startListening, onComplete]);

  useEffect(() => { submitRef.current = handleAnswerSubmit; }, [handleAnswerSubmit]);

  // End interview when the 10-minute timer runs out
  useEffect(() => {
    if (timeLeft === 0 && isActive && !stoppedRef.current) {
      stoppedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      audioRef.current?.pause();
      audioRef.current = null;
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
      onComplete(historyRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ── Public API ────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (stoppedRef.current || isActive) return;
    setIsActive(true);
    setPlanIndex(0);
    setTimeLeft(INTERVIEW_DURATION_SECS);

    // Start the 10-minute countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const firstQ = plan.questions[0]?.question ?? "";
    setCurrentQuestion(firstQ);
    setStatus("speaking");
    await speak(firstQ);
    if (!stoppedRef.current) startListening();
  }, [plan, speak, startListening, isActive]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    onComplete(historyRef.current);
  }, [onComplete]);

  // Lets the user manually finish their answer (mapped to "Done Answering" button)
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const submitManual = useCallback((answer: string) => {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    void handleAnswerSubmit(answer);
  }, [handleAnswerSubmit]);

  return {
    status,
    currentQuestion,
    planIndex,
    transcript,
    history,
    supported,
    isActive,
    timeLeft,
    start,
    stop,
    stopListening,
    submitManual,
  };
}
