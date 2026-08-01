"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "nyamfusima@gmail.com";

interface Session {
  id: string;
  user_email: string;
  cv_text: string;
  job_description: string;
  tailored_cv: any;
  match_score: number;
  created_at: string;
}

interface Stats {
  totalSessions: number;
  totalUsers: number;
  avgScore: number;
  todaySessions: number;
}

interface ProUser {
  id: string;
  email: string;
  plan: "pro";
  plan_type: "pro_monthly" | "pro_yearly" | null;
  plan_expires_at: string | null;
  buyer_name: string | null;
  purchased_at: string | null;
}

type RoleBreakdown = { role: string; count: number };

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [roles, setRoles] = useState<RoleBreakdown[]>([]);
  const [proUsers, setProUsers] = useState<ProUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"cv" | "job" | "tailored">("tailored");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/"); return; }
    if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
    fetchData();
  }, [user, loading]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin data");
      const { sessions: data, stats, proUsers: proUserData } = await res.json();
      setSessions(data);
      setStats(stats);
      setRoles(buildRoleBreakdown(data));
      setProUsers(proUserData ?? []);
    } catch (err) {
      console.error(err);
    }
    setFetching(false);
  };

  const downloadCV = (session: Session) => {
    const name = (session.tailored_cv?.name || "user").replace(/\s+/g, "-");
    const date = new Date(session.created_at).toISOString().slice(0, 10);
    const blob = new Blob([session.cv_text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTailoredCV = (session: Session) => {
    const cv = session.tailored_cv;
    if (!cv) return;
    const lines: string[] = [];
    if (cv.name) lines.push(cv.name.toUpperCase(), "");
    const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(" | ");
    if (contact) lines.push(contact, "");
    if (cv.summary) lines.push("PROFESSIONAL SUMMARY", cv.summary, "");
    if (cv.skills?.length) {
      lines.push("SKILLS");
      cv.skills.forEach((g: any) => lines.push(`${g.category}: ${g.skills.join(", ")}`));
      lines.push("");
    }
    if (cv.experience?.length) {
      lines.push("EXPERIENCE");
      cv.experience.forEach((job: any) => {
        lines.push(`${job.title} | ${job.company} | ${job.dates}`);
        job.bullets?.forEach((b: string) => lines.push(`  • ${b}`));
        lines.push("");
      });
    }
    if (cv.education?.length) {
      lines.push("EDUCATION");
      cv.education.forEach((ed: any) => lines.push(`${ed.degree} | ${ed.institution} | ${ed.dates}`));
      lines.push("");
    }
    const name = (cv.name || "user").replace(/\s+/g, "-");
    const date = new Date(session.created_at).toISOString().slice(0, 10);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-tailored-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJobMatch = (session: Session) => {
    sessionStorage.setItem("adminCV", JSON.stringify({
      cvText: session.cv_text,
      userName: session.tailored_cv?.name || "User",
      userEmail: session.user_email,
    }));
    router.push("/job-match");
  };

  const primaryRole = (session: Session) =>
    (session.tailored_cv?.meta?.primaryRole ||
      session.tailored_cv?.experience?.[0]?.title ||
      session.tailored_cv?.originalCV?.experience?.[0]?.title ||
      "Unknown") as string;

  const buildRoleBreakdown = (data: Session[]): RoleBreakdown[] => {
    const counts: Record<string, number> = {};
    data.forEach((s) => {
      const role = primaryRole(s).trim() || "Unknown";
      counts[role] = (counts[role] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const formatExpiry = (expiry: string | null) => {
    if (!expiry) return "Not recorded";
    const date = new Date(expiry);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatPurchaseDate = (date: string | null) => {
    if (!date || Number.isNaN(new Date(date).getTime())) return "Not recorded";
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const expiryStatus = (expiry: string | null) => {
    if (!expiry) return { label: "Unknown", className: "bg-slate-100 text-slate-600" };
    const daysLeft = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0) return { label: "Expired", className: "bg-red-100 text-red-700" };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, className: "bg-amber-100 text-amber-700" };
    return { label: `${daysLeft}d left`, className: "bg-emerald-100 text-emerald-700" };
  };

  if (loading || fetching) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <span className="font-semibold text-slate-800 tracking-tight">my</span>
            <img src="/favicon.ico" alt="myCVtailor.co.za" className="w-5 h-5" />
            <span className="font-semibold text-slate-800 tracking-tight">tailor.co.za</span>
          </Link>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#0d1f3c" }}
          >
            Admin
          </span>
        </div>
        <button
          onClick={fetchData}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
          ↺ Refresh
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total tailors", value: stats.totalSessions },
              { label: "Unique users", value: stats.totalUsers },
              { label: "Avg ATS score", value: `${stats.avgScore}%` },
              { label: "Today", value: stats.todaySessions },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: "#0d1f3c" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Top roles */}
        {roles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top roles (uploads)</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role.role}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full border"
                  style={{ borderColor: "#e2e8f0", backgroundColor: "#f8fafc", color: "#0d1f3c" }}
                >
                  {role.role} â€¢ {role.count}
                </span>
              ))}
            </div>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmed Pro purchases</p>
            <p className="text-sm text-slate-600 mt-1">{proUsers.length} confirmed Pro {proUsers.length === 1 ? "purchase" : "purchases"}</p>
          </div>
          {proUsers.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">No confirmed Pro purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Buyer</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Purchased</th>
                    <th className="px-5 py-3 font-semibold">Expires</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proUsers.map((proUser) => {
                    const status = expiryStatus(proUser.plan_expires_at);
                    return (
                      <tr key={proUser.id} className="text-sm">
                        <td className="px-5 py-3 text-slate-700">{proUser.buyer_name || "—"}</td>
                        <td className="px-5 py-3 text-slate-700">{proUser.email}</td>
                        <td className="px-5 py-3 text-slate-600">{proUser.plan_type === "pro_yearly" ? "Yearly" : proUser.plan_type === "pro_monthly" ? "Monthly" : "Pro"}</td>
                        <td className="px-5 py-3 text-slate-600">{formatPurchaseDate(proUser.purchased_at)}</td>
                        <td className="px-5 py-3 text-slate-600">{formatExpiry(proUser.plan_expires_at)}</td>
                        <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex gap-6 items-start">

          {/* Sessions list */}
          <div className="w-96 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              All sessions ({sessions.length})
            </p>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {sessions.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">No sessions yet.</p>
              )}
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => { setSelected(session); setActiveTab("tailored"); }}
                  className="w-full text-left p-4 rounded-2xl border transition-all cursor-pointer"
                  style={{
                    backgroundColor: selected?.id === session.id ? "#f0f4ff" : "white",
                    borderColor: selected?.id === session.id ? "#0d1f3c" : "#e2e8f0",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {session.tailored_cv?.name || "Unknown"}
                    </p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: session.match_score >= 80 ? "#d1fae5" : session.match_score >= 60 ? "#fef3c7" : "#fee2e2",
                        color: session.match_score >= 80 ? "#065f46" : session.match_score >= 60 ? "#92400e" : "#991b1b",
                      }}
                    >
                      {session.match_score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{session.user_email}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{primaryRole(session)}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {new Date(session.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                  <div
                    className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => downloadCV(session)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all"
                      title="Download original CV as .txt"
                    >
                      CV ↓
                    </button>
                    <button
                      onClick={() => downloadTailoredCV(session)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-all"
                      title="Download tailored CV as .txt"
                    >
                      Tailored ↓
                    </button>
                    <button
                      onClick={() => handleJobMatch(session)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg text-white bg-[#4F46E5] hover:bg-[#183763] transition-colors"
                      title="Run job match for this user's CV"
                    >
                      Job match →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session detail */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-slate-400 text-sm">Select a session to view details</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Detail header */}
                <div
                  className="px-6 py-5 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #0d1f3c, #1a3a6b)" }}
                >
                  <div>
                    <p className="text-white font-bold text-lg">
                      {selected.tailored_cv?.name}
                    </p>
                    <p className="text-blue-100 text-xs mt-0.5">{primaryRole(selected)}</p>
                    <p className="text-blue-200 text-xs mt-0.5">{selected.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{selected.match_score}%</p>
                    <p className="text-blue-200 text-xs">ATS score</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                  {[
                    { id: "tailored", label: "Tailored CV" },
                    { id: "cv", label: "Original CV" },
                    { id: "job", label: "Job Description" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className="px-5 py-3 text-xs font-semibold transition-all"
                      style={{
                        color: activeTab === tab.id ? "#0d1f3c" : "#94a3b8",
                        borderBottom: activeTab === tab.id ? "2px solid #0d1f3c" : "2px solid transparent",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6 max-h-[55vh] overflow-y-auto">

                  {activeTab === "tailored" && selected.tailored_cv && (
                    <div className="font-serif space-y-5 text-sm text-slate-700">
                      {/* Contact */}
                      <div className="text-center pb-4 border-b border-slate-100">
                        <p className="font-bold text-slate-900 text-base uppercase tracking-widest">{selected.tailored_cv.name}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {[selected.tailored_cv.email, selected.tailored_cv.phone, selected.tailored_cv.location].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      {/* Summary */}
                      {selected.tailored_cv.summary && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Summary</p>
                          <p className="text-sm leading-relaxed">{selected.tailored_cv.summary}</p>
                        </div>
                      )}

                      {/* Skills */}
                      {selected.tailored_cv.skills?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Skills</p>
                          {selected.tailored_cv.skills.map((g: any, i: number) => (
                            <div key={i} className="flex gap-2 text-sm mb-1">
                              <span className="font-bold text-slate-800 shrink-0">{g.category}:</span>
                              <span className="text-slate-600">{g.skills.join(", ")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Experience */}
                      {selected.tailored_cv.experience?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Experience</p>
                          {selected.tailored_cv.experience.map((job: any, i: number) => (
                            <div key={i} className="mb-4">
                              <div className="flex justify-between">
                                <p className="font-bold text-slate-900">{job.title}</p>
                                <p className="text-xs text-slate-400">{job.dates}</p>
                              </div>
                              <p className="text-xs italic text-slate-500 mb-1">{job.company}</p>
                              {job.bullets?.map((b: string, j: number) => (
                                <p key={j} className="text-xs text-slate-600 flex gap-1.5">
                                  <span>•</span><span>{b}</span>
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "cv" && (
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                      {selected.cv_text}
                    </pre>
                  )}

                  {activeTab === "job" && (
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                      {selected.job_description}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
