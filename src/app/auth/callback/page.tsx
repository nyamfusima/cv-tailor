"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthCallbackPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handleRedirect() {
      try {
        // Supabase automatically parses the session from the URL
        // just reload the page to trigger onAuthStateChange
        router.replace("/upload"); // redirect after login
      } catch (error) {
        console.error("OAuth callback error:", error);
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