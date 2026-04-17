import { initializePaddle, Paddle } from "@paddle/paddle-js";

let paddleInstance: Paddle | undefined;

export async function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance;

  paddleInstance = await initializePaddle({
    environment: "production",
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  });

  return paddleInstance;
}

export const PRICE_IDS = {
  pro_monthly:
    process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!,
  pro_yearly:
    process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID ||
    process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!,
};

export const CREDIT_MAP: Record<string, { tailor_credits: number; pdf_credits: number }> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!]: {
    tailor_credits: 999,
    pdf_credits: 999,
  },
  [process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID || process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!]: {
    tailor_credits: 999,
    pdf_credits: 999,
  },
  [process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!]: { tailor_credits: 999, pdf_credits: 999 },
};
