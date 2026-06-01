"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Microphone } from "@phosphor-icons/react";

type Screen = "setup" | "interview";

/* ---------- Placeholder: Setup Screen ---------- */
function SetupScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7EFEB] text-stone-600">
        <Microphone size={32} weight="duotone" />
      </div>
      <h2 className="text-2xl font-bold text-[#0D1F3C]">AI Voice Interviewer</h2>
      <p className="mt-3 max-w-md text-sm text-gray-500 leading-6">
        Setup screen coming in Stage 2. Paste your job description here to begin.
      </p>
      <button
        onClick={onStart}
        className="mt-8 rounded-xl bg-[#0D1F3C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1a3a6b] transition-colors"
      >
        Preview interview screen
      </button>
    </div>
  );
}

/* ---------- Placeholder: Interview Screen ---------- */
function InterviewScreen({ onEnd }: { onEnd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DDF3EC] text-emerald-700">
        <Microphone size={32} weight="duotone" />
      </div>
      <h2 className="text-2xl font-bold text-[#0D1F3C]">Interview in progress</h2>
      <p className="mt-3 max-w-md text-sm text-gray-500 leading-6">
        Interview screen coming in Stage 4. Voice I/O and question flow will live here.
      </p>
      <button
        onClick={onEnd}
        className="mt-8 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#0D1F3C] hover:bg-gray-50 transition-colors"
      >
        Back to setup
      </button>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function InterviewPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("setup");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }

    async function checkPro() {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("job_credits")
        .eq("id", user.id)
        .single();

      if ((data?.job_credits ?? 0) <= 0) {
        router.push("/pricing");
        return;
      }
      setIsPro(true);
    }

    void checkPro();
  }, [user, loading, router]);

  if (loading || isPro === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-400 text-sm font-sans">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my
          <Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />
          tailor.co.za
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#183763]"
          >
            Dashboard
          </Link>
          <button
            onClick={() => void signOut()}
            className="text-xs text-slate-500 hover:text-[#0D1F3C] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 py-10">
        {screen === "setup" ? (
          <SetupScreen onStart={() => setScreen("interview")} />
        ) : (
          <InterviewScreen onEnd={() => setScreen("setup")} />
        )}
      </main>
    </div>
  );
}
