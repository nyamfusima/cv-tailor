import { NextRequest, NextResponse } from "next/server";
import { parseFileWithMeta } from "@/lib/parseFile";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserCredits } from "@/lib/user";
import { createClient } from "@supabase/supabase-js";
import { createOpenAICompleteJson } from "@/lib/cv";
import { createSupabaseCreditStore } from "@/lib/cv/credits";
import { executeTailorRequest } from "@/lib/cv/tailorRequest";

const completeJson = createOpenAICompleteJson();

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "SIGN_IN_REQUIRED", message: "Please sign in to tailor your CV." },
      { status: 401 },
    );
  }

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "nyamfusima@gmail.com,hamza26mohamud@gmail.com,the.real.chad.naude@gmail.com,ngqongwaayandisa@gmail.com,somilamangqu@gmail.com,moabithapelo1@gmail.com,sikhanyiselesky@gmail.com,zengetwasisipho@gmail.com")
    .split(",").map((e) => e.trim());
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");

  const formData = await req.formData();
  const cvFile = formData.get("cv") as File | null;
  const jobDescription = String(formData.get("jobDescription") ?? "");
  const reviewedSourceRaw = formData.get("reviewedSource");
  const requestId = String(formData.get("requestId") || req.headers.get("x-tailor-request-id") || crypto.randomUUID());
  const extractionConfirmed = String(formData.get("extractionConfirmed") ?? "") === "true";

  let cvText = "";
  let isLikelyImageOnly = false;
  let fileName = "upload";
  if (cvFile) {
    const parsed = await parseFileWithMeta(cvFile);
    cvText = parsed.text;
    isLikelyImageOnly = parsed.isLikelyImageOnly;
    fileName = cvFile.name || "upload";
  }
  if (!cvText && typeof reviewedSourceRaw === "string") {
    cvText = "";
  }

  let reviewedSource: unknown;
  if (typeof reviewedSourceRaw === "string" && reviewedSourceRaw.trim()) {
    try {
      reviewedSource = JSON.parse(reviewedSourceRaw);
    } catch {
      return NextResponse.json({ error: "Invalid reviewed source." }, { status: 400 });
    }
  }

  const db = adminClient();
  const result = await executeTailorRequest({
    user: { id: user.id, email: user.email },
    isAdmin,
    jobDescription,
    requestId,
    reviewedSource,
    cvText,
    isLikelyImageOnly,
    extractionConfirmed,
    fileName,
    completeJson,
    creditStore: createSupabaseCreditStore(db),
    persist: async (payload) => {
      const { error } = await db.from("tailor_sessions").insert(payload);
      return { error };
    },
    loadCredits: () => getUserCredits(user.id),
  });

  return NextResponse.json(result.body, { status: result.status });
}
