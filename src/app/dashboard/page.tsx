"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  FilePdf,
  UploadSimple,
  CheckCircle,
  X,
} from "@phosphor-icons/react";

/* ---------------- TYPES ---------------- */
interface UserData {
  plan: "free" | "pro";
  tailor_count: number;
  tailor_reset_date: string;
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

/* ---------------- BENTO CARD ---------------- */
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
      group relative flex min-h-[180px] flex-col rounded-[20px] border p-5 text-left sm:min-h-[280px] sm:p-8
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
    <div className="mt-auto pb-8 sm:pb-12">
      <h3 className={`text-lg font-bold leading-tight sm:text-2xl ${textColor}`}>
        {title}
      </h3>
      <p className={`mt-2 sm:mt-4 max-w-sm text-xs sm:text-sm font-medium leading-6 ${textColor} opacity-80`}>
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
        className="group relative min-h-[180px] cursor-pointer rounded-[20px] border border-emerald-100 bg-[#DDF3EC] p-5 text-left text-emerald-800 shadow-[0_18px_45px_rgba(13,31,60,0.04)] outline-none transition-shadow hover:shadow-[0_24px_55px_rgba(13,31,60,0.08)] focus-visible:ring-2 focus-visible:ring-[#0D1F3C]/20 focus-visible:ring-offset-2 sm:min-h-[280px] sm:p-8"
      >
        <MagicWand size={28} weight="duotone" className="opacity-95" />
        <div className="mt-auto pb-8 sm:pb-12">
          <h3 className="text-lg font-bold leading-tight text-emerald-950 sm:text-2xl">
            Tailor your CV
          </h3>
          <p className="mt-2 sm:mt-4 max-w-2xl text-xs sm:text-sm font-medium leading-6 text-emerald-800/80">
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

/* ---------------- MASTER CV SECTION ---------------- */
interface MasterCVSectionProps {
  userData: UserData | null;
  uploading: boolean;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
  onClearError: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MasterCVSection = ({
  userData,
  uploading,
  uploadError,
  onFileSelect,
  onClearError,
  fileInputRef,
}: MasterCVSectionProps) => {
  const hasCV = !!userData?.master_cv_path;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="mb-6 bg-white rounded-xl border border-black/8 overflow-hidden shadow-[0_16px_45px_rgba(13,31,60,0.05)]">
      <div className="px-4 py-3 border-b border-black/5 flex justify-between items-center">
        <span className="text-sm font-medium text-[#0D1F3C]">Master CV</span>
        {hasCV && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-[#1a3a6b] font-semibold hover:text-[#0D1F3C] transition-colors disabled:opacity-40"
          >
            Replace
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        {uploading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="h-4 w-4 rounded-full border-2 border-[#0D1F3C]/20 border-t-[#0D1F3C] animate-spin" />
            Uploading your CV...
          </div>
        ) : hasCV ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FilePdf size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#0D1F3C]">
                {userData.master_cv_name}
              </p>
              <p className="text-xs text-gray-400">
                Used by Job Match &amp; Voice Interviewer
              </p>
            </div>
            <CheckCircle size={18} weight="fill" className="ml-auto shrink-0 text-emerald-500" />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0D1F3C]">No CV uploaded yet</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Required for Job Match and Voice Interviewer. Accepts PDF or DOCX.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-[#0D1F3C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a3a6b] transition-colors"
            >
              <UploadSimple size={14} weight="bold" />
              Upload CV
            </button>
          </div>
        )}

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="flex-1">{uploadError}</span>
            <button onClick={onClearError} className="shrink-0 mt-0.5">
              <X size={12} weight="bold" />
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

/* ---------------- MAIN ---------------- */
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleMasterCVUpload = async (file: File) => {
    setCvUploadError(null);
    setCvUploading(true);
    try {
      const form = new FormData();
      form.append("cv", file);

      const res = await fetch("/api/upload-master-cv", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed.");

      setUserData((prev) =>
        prev ? { ...prev, master_cv_path: data.path, master_cv_name: data.name } : prev
      );
    } catch (err: unknown) {
      setCvUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setCvUploading(false);
    }
  };

  const isPro = userData?.plan === "pro";
  const tailorsLeft = isPro ? null : Math.max(0, 3 - (userData?.tailor_count ?? 0));
  const canUseJobMatch = isPro;

  if (loading || fetching) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-400 text-sm font-sans">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* HEADER */}
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my
          <Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />
          tailor.co.za
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {isPro ? (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white font-semibold">
              Pro
            </span>
          ) : (
            <>
              <span className="hidden sm:block text-xs px-3 py-1 rounded-full bg-white border border-black/8 text-slate-600">
                {tailorsLeft} credit{tailorsLeft !== 1 ? "s" : ""}
              </span>
              <Link
                href="/pricing"
                className="text-xs bg-[#4F46E5] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#183763] transition-colors"
              >
                Upgrade
              </Link>
            </>
          )}
          <button onClick={() => void signOut()} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-100">
            Sign out
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-5 py-8 sm:py-10">

        {/* HERO */}
        <div className="mb-10">
          <h1 className="max-w-2xl text-3xl font-bold leading-[0.98] tracking-tight text-black sm:text-5xl">
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

        {/* MASTER CV */}
        <MasterCVSection
          userData={userData}
          uploading={cvUploading}
          uploadError={cvUploadError}
          onFileSelect={(file) => void handleMasterCVUpload(file)}
          onClearError={() => setCvUploadError(null)}
          fileInputRef={fileInputRef}
        />

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
            <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-black/5">
              <h3 className="text-sm font-medium text-[#0D1F3C] mb-3">Tailored CV</h3>
              <pre className="text-xs whitespace-pre-wrap text-gray-600">
                {JSON.stringify(selectedSession.tailored_cv, null, 2)}
              </pre>
            </div>
            <div className="p-4 sm:p-5 bg-white">
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
