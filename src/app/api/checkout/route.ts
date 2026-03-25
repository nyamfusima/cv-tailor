import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// LemonSqueezy variant IDs — set these in your .env
// LEMONSQUEEZY_VARIANT_STARTER=xxxxx  (5 tailors, $5)
// LEMONSQUEEZY_VARIANT_GROWTH=xxxxx   (20 tailors, $20)
// LEMONSQUEEZY_VARIANT_NINJA=xxxxx    (unlimited, $50)

const VARIANT_IDS: Record<string, string> = {
  starter: process.env.LEMONSQUEEZY_VARIANT_STARTER!,
  growth:  process.env.LEMONSQUEEZY_VARIANT_GROWTH!,
  ninja:   process.env.LEMONSQUEEZY_VARIANT_NINJA!,
};

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type || !VARIANT_IDS[type]) {
    return NextResponse.json({ error: "Invalid plan type." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/upload`);
  }

  const variantId = VARIANT_IDS[type];
  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY!;

  // Create a checkout session via LemonSqueezy API
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              user_id: user.id,
              plan_type: type,
            },
          },
          product_options: {
            redirect_url: `${origin}/upload?upgraded=true`,
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: storeId },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("LemonSqueezy checkout error:", data);
    return NextResponse.redirect(`${origin}/pricing?error=checkout_failed`);
  }

  const checkoutUrl = data?.data?.attributes?.url;
  if (!checkoutUrl) {
    return NextResponse.redirect(`${origin}/pricing?error=no_url`);
  }

  return NextResponse.redirect(checkoutUrl);
}