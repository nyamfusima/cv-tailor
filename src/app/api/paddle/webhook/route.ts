import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREDIT_MAP: Record<string, { tailor_credits: number; pdf_credits: number }> = {
  [process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID!]: { tailor_credits: 5, pdf_credits: 5 },
  [process.env.NEXT_PUBLIC_PADDLE_GROWTH_PRICE_ID!]: { tailor_credits: 20, pdf_credits: 20 },
  [process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!]: { tailor_credits: 999, pdf_credits: 999 },
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 401 });
  }

  // Verify webhook signature
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET!;
  const isValid = await verifyPaddleSignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event_type !== "transaction.completed") {
    return NextResponse.json({ received: true });
  }

  const transaction = event.data;
  const customerEmail = transaction?.customer?.email;
  const items = transaction?.items ?? [];

  if (!customerEmail) {
    return NextResponse.json({ error: "No customer email" }, { status: 400 });
  }

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, tailor_credits, pdf_credits")
    .eq("email", customerEmail)
    .single();

  if (userError || !userData) {
    console.error("User not found:", customerEmail);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Calculate credits to add
  let tailorCreditsToAdd = 0;
  let pdfCreditsToAdd = 0;

  for (const item of items) {
    const priceId = item?.price?.id;
    const credits = CREDIT_MAP[priceId];
    if (credits) {
      tailorCreditsToAdd += credits.tailor_credits;
      pdfCreditsToAdd += credits.pdf_credits;
    }
  }

  if (tailorCreditsToAdd === 0 && pdfCreditsToAdd === 0) {
    return NextResponse.json({ error: "No matching price ID" }, { status: 400 });
  }

  // Update user credits
  const { error: updateError } = await supabase
    .from("users")
    .update({
      tailor_credits: userData.tailor_credits + tailorCreditsToAdd,
      pdf_credits: userData.pdf_credits + pdfCreditsToAdd,
    })
    .eq("id", userData.id);

  if (updateError) {
    console.error("Failed to update credits:", updateError);
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
  }

  console.log(`✅ Credited ${customerEmail}: +${tailorCreditsToAdd} tailor, +${pdfCreditsToAdd} PDF`);
  return NextResponse.json({ success: true });
}

async function verifyPaddleSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      signature.split(";").map((part) => part.split("=") as [string, string])
    );
    const timestamp = parts["ts"];
    const h1 = parts["h1"];

    if (!timestamp || !h1) return false;

    const signedPayload = `${timestamp}:${rawBody}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === h1;
  } catch {
    return false;
  }
}