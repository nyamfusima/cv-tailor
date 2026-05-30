"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleReset = async () => {
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password updated!");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <span className="font-semibold text-slate-800 tracking-tight text-lg">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-6 h-6" />
          <span className="font-semibold text-slate-800 tracking-tight text-lg">tailor.ai</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

          <div className="text-center mb-6">
            <h1
              style={{ color: "#0d1f3c" }}
              className="text-2xl text-slate-900 mb-1"
            >
              Set a new password
            </h1>
            <p className="text-sm text-slate-400">Choose something you haven't used before</p>
          </div>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-emerald-700">{success} Redirecting…</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <button
              onClick={handleReset}
              disabled={loading || !!success}
              className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all"
              style={{
                background: loading || success ? "#94a3b8" : "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                cursor: loading || success ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Please wait..." : "Update password →"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
