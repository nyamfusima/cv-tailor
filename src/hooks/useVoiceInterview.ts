import { useCallback, useEffect, useRef, useState } from "react";

/* ── Shared types (imported by the interview page too) ─────────── */

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

export interface UseVoiceInterviewReturn {
  status: InterviewStatus;
  currentQuestion: string;
  planIndex: number;
  transcript: string;
  history: HistoryEntry[];
  supported: boolean;
  isActive: boolean;
  start: () => void;
  stop: () => void;
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

  // Refs keep latest values accessible inside async callbacks without stale closures
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");
  const planIndexRef = useRef(0);
  const historyRef = useRef<HistoryEntry[]>([]);
  const currentQRef = useRef(plan.questions[0]?.question ?? "");
  const stoppedRef = useRef(false);
  // Forward ref breaks the circular dep between startListening → submitRef → handleAnswerSubmit
  const submitRef = useRef<((answer: string) => void) | null>(null);

  // Helpers that update both state (for re-renders) and refs (for callbacks)
  const setPlanIndex = (n: number) => { planIndexRef.current = n; setPlanIndexState(n); };
  const setCurrentQuestion = (q: string) => { currentQRef.current = q; setCurrentQuestionState(q); };
  const setHistory = (h: HistoryEntry[]) => { historyRef.current = h; setHistoryState(h); };

  // Browser support check + cleanup
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) setSupported(false);
    return () => {
      stoppedRef.current = true;
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort?.();
    };
  }, []);

  // ── TTS ───────────────────────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> => new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;
    u.lang = "en-US";
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  }), []);

  // ── STT ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (stoppedRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;
    finalTextRef.current = "";
    setTranscript("");
    setStatus("listening");

    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

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
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error !== "aborted") submitRef.current?.(finalTextRef.current.trim());
    };

    rec.onend = () => {
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
      // Fallback: skip to next planned question rather than stalling
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

  // Keep forward ref current so startListening always calls the latest version
  useEffect(() => { submitRef.current = handleAnswerSubmit; }, [handleAnswerSubmit]);

  // ── Public API ────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (stoppedRef.current || isActive) return;
    setIsActive(true);
    setPlanIndex(0);
    const firstQ = plan.questions[0]?.question ?? "";
    setCurrentQuestion(firstQ);
    setStatus("speaking");
    await speak(firstQ);
    if (!stoppedRef.current) startListening();
  }, [plan, speak, startListening, isActive]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    onComplete(historyRef.current);
  }, [onComplete]);

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
    start,
    stop,
    submitManual,
  };
}
