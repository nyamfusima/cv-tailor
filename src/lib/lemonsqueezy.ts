import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
});

export const PLANS = {
  free: {
    name: "Free",
    tailorsPerMonth: 3,
    coverLetter: false,
  },
  pro: {
    name: "Pro",
    tailorsPerMonth: Infinity,
    coverLetter: true,
  },
};