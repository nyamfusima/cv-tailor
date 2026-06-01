"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  MagicWand,
  Buildings,
  Microphone,
  Lightning,
} from "@phosphor-icons/react";

/* ---------------- TYPES ---------------- */
interface UserData {
  tailor_credits: number;
  pdf_credits: number;
  job_credits: number;
  total_tailors_used: number;
  master_cv_path: string | null;
  master_cv_name: string | null;
}

interface Session {
  id: string;
  tailored_cv: unknown;
  match_score: number;
  created_at: string;
  job_description: string;
  cv_text: string;
}

type DashboardRouter = ReturnType<typeof useRouter>;

/* ---------------- HELPERS ---------------- */
const getScoreStyle = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
};

const getJobTitle = (s: Session) =>
  s.job_description?.split("\n")[0]?.slice(0, 60) || "Untitled Role";

/* ---------------- BOUNCE CARD ---------------- */
interface BentoCardProps {
  color: string;
  textColor: string;
  arrowColor?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  status?: string;
}

const BentoCard = ({
  color,
  textColor,
  arrowColor = "bg-[#191919]",
  icon,
  title,
  description,
  onClick,
  disabled,
  className = "",
  status = "Coming soon",
}: BentoCardProps) => (
  <motion.button
    type="button"
    whileHover={!disabled ? { y: -3 } : {}}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    onClick={!disabled ? onClick : undefined}
    disabled={disabled}
    className={`
      group relative flex min-h-[240px] flex-col rounded-[20px] border p-6 text-left sm:min-h-[320px] sm:p-8
      shadow-[0_18px_45px_rgba(13,31,60,0.04)] outline-none transition-shadow
      focus-visible:ring-2 focus-visible:ring-[#0D1F3C]/20 focus-visible:ring-offset-2
      ${color} ${disabled ? "cursor-default opacity-55" : "cursor-pointer hover:shadow-[0_24px_55px_rgba(13,31,60,0.08)]"}
      ${className}
    `}
  >
    {disabled && (
      <span className="absolute right-4 top-4 rounded-full bg-white/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/30 sm:right-5 sm:top-5 sm:px-3 sm:text-[11px]">
        {status}
      </span>
    )}

    <div className={`${textColor} opacity-95`}>{icon}</div>

    <div className="mt-auto pb-10 sm:pb-12">
      <h3 className={`text-xl font-bold leading-tight sm:text-2xl ${textColor}`}>
        {title}
      </h3>
      <p className={`mt-4 max-w-sm text-sm font-medium leading-6 ${textColor} opacity-80`}>
        {description}
      </p>
    </div>

    {!disabled && (
      <span className={`absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:bottom-6 sm:right-6 ${arrowColor}`}>
        <ArrowUpRight size={18} weight="bold" />
      </span>
    )}
  </motion.button>
);

/* ---------------- BENTO GRID ---------------- */
const BentoGrid = ({
  router,
  canUseJobMatch,
}: {
  router: DashboardRouter;
  canUseJobMatch: boolean;
}) => (
  <section className="mb-8 rounded-xl bg-white">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

      {/* TAILOR CV */}
      <motion.button
        type="button"
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={() => router.push("/upload")}
        className="group relative min-h-[240px] cursor-pointer rounded-[20px] border border-emerald-100 bg-[#DDF3EC] p-6 text-left text-emerald-800 shadow-[0_18px_45px_rgba(13,31,60,0.04)] outline-none transition-shadow hover:shadow-[0_24px_55px_rgba(13,31,60,0.08)] focus-visible:ring-2 focus-visible:ring-[#0D1F3C]/20 focus-visible:ring-offset-2 sm:min-h-[320px] sm:p-8"
      >
        <MagicWand size={28} weight="duotone" className="opacity-95" />
        <div className="mt-auto pb-10 sm:pb-12">
          <h3 className="text-xl font-bold leading-tight text-emerald-950 sm:text-2xl">
            Tailor your CV
          </h3>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-emerald-800/80">
            Paste a job description or job link and get your CV rewritten to match keywords, tone, and ATS structure.
          </p>
        </div>
        <span className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:bottom-6 sm:right-6">
          <ArrowUpRight size={18} weight="bold" />
        </span>
      </motion.button>

      {/* JOB MATCH */}
      <BentoCard
        color="border-amber-100 bg-[#FFF3DA]"
        textColor="text-amber-800"
        arrowColor="bg-amber-600"
        icon={<Buildings size={28} weight="duotone" />}
        title="Job match"
        description="AI ranks real listings against your CV profile and surfaces the best-fit roles."
        disabled={!canUseJobMatch}
        status="Upgrade"
        onClick={() => router.push("/job-match")}
      />

      {/* VOICE INTERVIEW */}
      <BentoCard
        color="border-stone-200 bg-[#F7EFEB]"
        textColor="text-stone-600"
        arrowColor="bg-stone-700"
        icon={<Microphone size={28} weight="duotone" />}
        title="Voice interviewer"
        description="Practice with an AI interviewer trained on real questions for your target role."
        disabled={!canUseJobMatch}
        status="Upgrade"
        onClick={() => router.push("/interview")}
      />

      {/* AUTO APPLY */}
      <BentoCard
        color="border-pink-100 bg-[#FFF0F6]"
        textColor="text-pink-600"
        icon={<Lightning size={28} weight="duotone" />}
        title="Auto apply"
        description="Apply to matched roles automatically, your CV, your criteria, zero effort."
        disabled
      />
    </div>
  </section>
);

/* ---------------- MAIN ---------------- */
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const [{ data: ud }, { data: sess }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase
        .from("tailor_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    setUserData(ud);
    setSessions(sess || []);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }
    const fetchTimer = window.setTimeout(() => {
      void fetchAll();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, [fetchAll, loading, router, user]);

  const credits = userData?.tailor_credits ?? 0;
  const canUseJobMatch = (userData?.job_credits ?? 0) > 0;

  if (loading || fetching) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-400 text-sm font-sans">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* HEADER — unchanged */}
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my
          <Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />
          tailor.co.za
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-white border border-black/8 text-slate-600">
            {credits} credits
          </span>
          <Link
            href="/pricing"
            className="text-xs bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#183763] transition-colors"
          >
            Upgrade
          </Link>
          <button onClick={() => void signOut()} className="text-xs text-slate-500 hover:text-[#0D1F3C] transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-5 py-8 sm:py-10">

        {/* HERO */}
        <div className="mb-10">
          <h1 className="max-w-2xl text-4xl font-bold leading-[0.98] tracking-tight text-black sm:text-5xl">
            Welcome back
            {user?.user_metadata?.full_name
              ? `, ${user.user_metadata.full_name.split(" ")[0]}`
              : ""}
            .
          </h1>
          <p className="mt-3 text-base font-semibold text-emerald-700">
            Ready to land interviews.
          </p>
        </div>

        {/* BENTO */}
        <BentoGrid router={router} canUseJobMatch={canUseJobMatch} />

        {/* SESSIONS */}
        <div className="bg-white rounded-xl border border-black/8 overflow-hidden shadow-[0_16px_45px_rgba(13,31,60,0.05)]">
          <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center">
            <span className="text-sm font-medium text-[#0D1F3C]">
              Recent CV tailors
            </span>
            <Link href="/upload" className="text-xs text-[#1a3a6b] font-semibold">
              New tailor
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="px-4 py-5 text-sm text-gray-400">
              No sessions yet.
            </div>
          ) : (
            sessions.slice(0, 6).map((s) => (
              <motion.button
                key={s.id}
                type="button"
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => setSelectedSession(s)}
                className="flex w-full justify-between items-center px-4 py-3 border-b border-black/5 last:border-0 cursor-pointer text-left hover:bg-[#fbfbfa] transition-colors"
              >
                <div>
                  <p className="text-sm text-[#0D1F3C] font-medium">
                    {getJobTitle(s)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getScoreStyle(s.match_score)}`}
                  >
                    {s.match_score}%
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </main>

      {/* MODAL */}
      {selectedSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedSession(null)}
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="p-5 border-b md:border-b-0 md:border-r border-black/5">
              <h3 className="text-sm font-medium text-[#0D1F3C] mb-3">Tailored CV</h3>
              <pre className="text-xs whitespace-pre-wrap text-gray-600">
                {JSON.stringify(selectedSession.tailored_cv, null, 2)}
              </pre>
            </div>
            <div className="p-5 bg-white">
              <h3 className="text-sm font-medium text-[#0D1F3C] mb-3">Job description</h3>
              <pre className="text-xs whitespace-pre-wrap text-gray-600">
                {selectedSession.job_description}
              </pre>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
