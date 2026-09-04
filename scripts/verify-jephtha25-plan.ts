import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: user } = await admin
    .from("users")
    .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
    .ilike("email", "jephtha25@gmail.com")
    .maybeSingle();
  const { data: purchases } = await admin
    .from("confirmed_purchases")
    .select("purchase_id, plan_type, purchase_email, user_email, purchased_at, subscription_end_date, refunded")
    .or('purchase_email.eq."jephtha25@gmail.com",user_email.eq."jephtha25@gmail.com",buyer_email.eq."jephtha25@gmail.com"');
  const { data: university } = await admin
    .from("users")
    .select("id, plan, plan_expires_at")
    .ilike("email", "3810895@myuwc.ac.za")
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        user_id: user?.id,
        email: user?.email,
        plan: user?.plan,
        plan_type: user?.plan_type,
        plan_expires_at: user?.plan_expires_at,
        tailor_count: user?.tailor_count,
        remaining_credits: user?.plan === "pro" ? null : Math.max(0, 3 - (user?.tailor_count ?? 0)),
        credits_unlimited: user?.plan === "pro",
        gmail_purchase_ids: (purchases ?? []).map((row) => row.purchase_id),
        gmail_purchase_count: purchases?.length ?? 0,
        university_user_id: university?.id,
        university_plan: university?.plan,
      },
      null,
      2,
    ),
  );
}

void main();
