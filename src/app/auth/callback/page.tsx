"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleRedirect() {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
        router.replace("/upload");
      } catch (error) {
        console.error("OAuth callback error:", error);
        router.replace("/upload");
      }
    }

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg font-medium">Signing you in… Please wait.</p>
    </div>
  );
}