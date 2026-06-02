"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CaretDownIcon, CaretUpIcon, MicrophoneIcon, ClockIcon } from "@phosphor-icons/react";

interface InterviewSession {
  id: string;
  job_title: string | null;
  debrief_text: string | null;
  transcript_json: { question: string; answer: string }[] | null;
  created_at: string;
}

const DEBRIEF_SECTIONS = [
  "Overall Impression",
  "Strongest Moment",
  "Areas to Improve",
  "Top 3 Tips for Next Time",
] as const;

const SECTION_COLOR: Record<string, string> = {
  "Overall Impression": "border-l-blue-400",
  "Strongest Moment": "border-l-emerald-400",
  "Areas to Improve": "border-l-amber-400",
  "Top 3 Tips for Next Time": "border-l-purple-400",
};

function parseDebrief(text: string): { title: string; content: string }[] {
  const out: { title: string; content: string }[] = [];
  for (let i = 0; i < DEBRIEF_SECTIONS.length; i++) {
    const title = DEBRIEF_SECTIONS[i];
    const next = DEBRIEF_SECTIONS[i + 1];
    const re = new RegExp(title.replace(/\s+/g, "\\s+"), "i");
    const start = text.search(re);
    if (start === -1) continue;
    const afterTitle = start + title.length;
    const end = next
      ? text.search(new RegExp(next.replace(/\s+/g, "\\s+"), "i"))
      : text.length;
    const content = text
      .slice(afterTitle, end !== -1 ? end : undefined)
      .replace(/^[\s:]+/, "")
      .trim();
    if (content) out.push({ title, content });
  }
  return out;
}

function SessionCard({ session }: { session: InterviewSession }) {
  const [open, setOpen] = useState(false);
  const sections = session.debrief_text ? parseDebrief(session.debrief_text) : [];
  const date = new Date(session.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
      {/* Row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7EFEB] text-stone-600">
            <MicrophoneIcon size={16} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0D1F3C]">
              {session.job_title || "Untitled role"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
              <ClockIcon size={11} weight="fill" />
              {date}
              {session.transcript_json && (
                <span className="ml-1">· {session.transcript_json.length} questions</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span className="text-xs font-semibold text-[#0D1F3C]">
            View debrief
          </span>
          {open
            ? <CaretUpIcon size={14} weight="bold" className="text-gray-400" />
            : <CaretDownIcon size={14} weight="bold" className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded debrief */}
      {open && (
        <div className="border-t border-black/5 px-5 py-5 space-y-4">
          {sections.length > 0 ? (
            sections.map(({ title, content }) => (
              <div
                key={title}
                className={`rounded-xl border-l-4 border border-black/8 bg-[#fafaf9] px-4 py-3.5 ${SECTION_COLOR[title] ?? "border-l-gray-300"}`}
              >
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  {title}
                </p>
                <p className="text-sm leading-relaxed text-[#0D1F3C]">{content}</p>
              </div>
            ))
          ) : session.debrief_text ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#0D1F3C]">
              {session.debrief_text}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No debrief saved for this session.</p>
          )}

          {/* Transcript accordion */}
          {session.transcript_json && session.transcript_json.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-[#0D1F3C] transition-colors select-none">
                View full transcript ({session.transcript_json.length} Q&amp;As)
              </summary>
              <div className="mt-3 space-y-3">
                {session.transcript_json.map((entry, i) => (
                  <div key={i} className="rounded-lg border border-black/5 bg-white px-4 py-3">
                    <p className="mb-1 text-xs font-semibold text-[#0D1F3C]">
                      Q{i + 1}. {entry.question}
                    </p>
                    <p className="text-sm leading-relaxed text-gray-500">{entry.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewHistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }

    async function fetchSessions() {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("id, job_title, debrief_text, transcript_json, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!error) setSessions(data ?? []);
      setFetching(false);
    }

    void fetchSessions();
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-400 text-sm font-sans">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans">
      <header className="h-16 bg-white/90 backdrop-blur border-b border-black/6 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-0 font-semibold text-[#0D1F3C]">
          my<Image src="/favicon.ico" alt="" width={20} height={20} className="mx-0.5" />tailor.co.za
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200">
            Dashboard
          </Link>
          <Link
            href="/interview"
            className="rounded-lg bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#183763] transition-colors"
          >
            New interview
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0D1F3C]">Past interviews</h1>
          <p className="mt-1 text-sm text-gray-400">
            {sessions.length === 0
              ? "No interviews saved yet."
              : `${sessions.length} session${sessions.length === 1 ? "" : "s"} saved`}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-black/8 bg-white px-6 py-12 text-center shadow-[0_4px_16px_rgba(13,31,60,0.04)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7EFEB] text-stone-500">
              <MicrophoneIcon size={24} weight="duotone" />
            </div>
            <p className="text-sm font-medium text-[#0D1F3C]">No interviews saved yet</p>
            <p className="mt-1.5 text-xs text-gray-400">
              Complete an interview and save your debrief — it will appear here.
            </p>
            <Link
              href="/interview"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#183763] transition-colors"
            >
              Start your first interview
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
