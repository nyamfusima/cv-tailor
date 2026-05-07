import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parseFile";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[extract-cv-text] Unauthorized — no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const cvFile = formData.get("cv") as File | null;

    if (!cvFile) {
      console.log("[extract-cv-text] No file provided in form data");
      return NextResponse.json({ error: "No CV file provided." }, { status: 400 });
    }

    console.log(`[extract-cv-text] Parsing: "${cvFile.name}" type="${cvFile.type}" size=${cvFile.size}B`);

    const text = await parseFile(cvFile);

    if (!text || text.trim().length < 50) {
      console.log("[extract-cv-text] Extracted text too short:", text?.length ?? 0, "chars");
      return NextResponse.json({ error: "Could not extract readable text from this CV. Try a different file." }, { status: 422 });
    }

    console.log(`[extract-cv-text] Success — ${text.length} chars extracted`);
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[extract-cv-text] Error:", err?.message ?? err);
    return NextResponse.json({ error: err.message || "Failed to extract CV text." }, { status: 500 });
  }
}
