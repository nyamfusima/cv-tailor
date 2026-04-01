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
  starter: process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID!,
  growth: process.env.NEXT_PUBLIC_PADDLE_GROWTH_PRICE_ID!,
  unlimited: process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!,
};

export const CREDIT_MAP: Record<string, { tailor_credits: number; pdf_credits: number }> = {
  [process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID!]: { tailor_credits: 5, pdf_credits: 5 },
  [process.env.NEXT_PUBLIC_PADDLE_GROWTH_PRICE_ID!]: { tailor_credits: 20, pdf_credits: 20 },
  [process.env.NEXT_PUBLIC_PADDLE_UNLIMITED_PRICE_ID!]: { tailor_credits: 999, pdf_credits: 999 },
};