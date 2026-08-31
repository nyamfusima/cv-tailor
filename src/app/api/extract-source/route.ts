import { NextRequest, NextResponse } from "next/server";
import { parseFileWithMeta } from "@/lib/parseFile";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createOpenAICompleteJson } from "@/lib/cv";
import { executeExtractRequest } from "@/lib/cv/tailorRequest";
import { ExtractionFailedError, IncompleteModelOutputError, ModelJsonParseError } from "@/lib/cv/types";

const completeJson = createOpenAICompleteJson();

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
    }

    const formData = await req.formData();
    const cvFile = formData.get("cv") as File | null;
    if (!cvFile) {
      return NextResponse.json({ error: "No CV file provided." }, { status: 400 });
    }

    const parsed = await parseFileWithMeta(cvFile);
    const result = await executeExtractRequest({
      cvText: parsed.text,
      isLikelyImageOnly: parsed.isLikelyImageOnly,
      completeJson,
    });

    return NextResponse.json({
      source: result.source,
      extractionReport: result.extractionReport,
    });
  } catch (err) {
    if (err instanceof ExtractionFailedError) {
      return NextResponse.json(
        { error: "EXTRACTION_FAILED", message: err.message, extractionReport: err.report },
        { status: 422 },
      );
    }
    if (err instanceof IncompleteModelOutputError || err instanceof ModelJsonParseError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "Failed to extract CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
