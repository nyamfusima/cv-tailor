import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch master CV path from DB
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: userData, error: dbError } = await adminClient
    .from("users")
    .select("master_cv_path, master_cv_name")
    .eq("id", user.id)
    .single();

  if (dbError || !userData?.master_cv_path) {
    return NextResponse.json({ error: "No master CV found." }, { status: 404 });
  }

  // Generate a 60-second signed download URL
  const { data: signed, error: signError } = await adminClient.storage
    .from("master-cvs")
    .createSignedUrl(userData.master_cv_path, 60);

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to generate URL." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, name: userData.master_cv_name });
}
