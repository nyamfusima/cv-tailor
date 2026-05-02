"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess("Check your inbox to confirm your account before signing in.");
        setMode("signin");
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error);
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password reset link sent — check your inbox.");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <span className="font-semibold text-slate-800 tracking-tight text-lg">my</span>
          <img src="/favicon.ico" alt="myCVtailor.ai" className="w-6 h-6" />
          <span className="font-semibold text-slate-800 tracking-tight text-lg">tailor.ai</span>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

          {/* Header */}
          <div className="text-center mb-6">
            <h1
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-2xl text-slate-900 mb-1"
            >
              {showForgotPassword
                ? "Reset your password"
                : mode === "signin"
                ? "Welcome back"
                : "Create your account"}
            </h1>
            <p className="text-sm text-slate-400">
              {showForgotPassword
                ? "Enter your email and we'll send a reset link"
                : mode === "signin"
                ? "Sign in to access your dashboard"
                : "Free account — 3 tailors included"}
            </p>
          </div>

          {/* Google + divider — hidden in forgot password mode */}
          {!showForgotPassword && (
            <>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            </>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {showForgotPassword ? (
            /* Forgot password form */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all"
                style={{
                  background: loading ? "#94a3b8" : "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Please wait..." : "Send reset link →"}
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                <button
                  onClick={() => { setShowForgotPassword(false); setError(""); setSuccess(""); }}
                  className="font-semibold underline"
                  style={{ color: "#0d1f3c" }}
                >
                  Back to sign in
                </button>
              </p>
            </div>
          ) : (
            /* Sign in / sign up form */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              {mode === "signin" && (
                <p className="text-right">
                  <button
                    onClick={() => { setShowForgotPassword(true); setError(""); setSuccess(""); }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Forgot password?
                  </button>
                </p>
              )}

              <button
                onClick={handleEmailAuth}
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all"
                style={{
                  background: loading ? "#94a3b8" : "linear-gradient(135deg, #0d1f3c, #1a3a6b)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Sign in →"
                  : "Create account →"}
              </button>
            </div>
          )}

          {/* Toggle mode — hidden in forgot password mode */}
          {!showForgotPassword && (
            <p className="text-center text-xs text-slate-400 mt-5">
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess(""); }}
                className="font-semibold underline"
                style={{ color: "#0d1f3c" }}
              >
                {mode === "signin" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          )}

        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-700">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>
        </p>

      </div>
    </div>
  );
}
