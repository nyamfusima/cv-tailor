"use client";

import { ArrowRight, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type BillingCycle = "monthly" | "yearly";
export type PlanId = "free" | "pro";

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyLabel?: string;
  yearlyLabel?: string;
  popular?: boolean;
  savings?: string;
  features: PricingFeature[];
  button: {
    monthlyText: string;
    yearlyText?: string;
  };
}

interface Pricing2Props {
  id?: string;
  heading?: string;
  description?: string;
  plans?: PricingPlan[];
  className?: string;
  showRationale?: boolean;
  onPlanSelect?: (planId: PlanId, billingCycle: BillingCycle) => void;
}

const defaultPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Enough to prove value without giving away the full stack forever.",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    monthlyLabel: "one time",
    yearlyLabel: "one time",
    features: [
      { text: "3 CV tailors total (one time)", included: true },
      { text: "3 PDF downloads", included: true },
      { text: "Job match (limited - 3 searches)", included: true },
      { text: "ATS score", included: true },
      { text: "Full ATS breakdown", included: false },
      { text: "Cover letter generator", included: false },
      { text: "Master CV storage", included: false },
      { text: "Dashboard + history", included: false },
      { text: "Priority processing", included: false },
    ],
    button: {
      monthlyText: "Get started free",
      yearlyText: "Get started free",
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "Built for serious job seekers who want speed, volume, and better conversion.",
    monthlyPrice: "R99",
    yearlyPrice: "R799",
    monthlyLabel: "/month",
    yearlyLabel: "/year",
    popular: true,
    savings: "Save 33% with annual billing (R67/month equivalent).",
    features: [
      { text: "Unlimited CV tailors", included: true },
      { text: "Unlimited PDF downloads", included: true },
      { text: "Unlimited job matches", included: true },
      { text: "ATS score", included: true },
      { text: "Full ATS breakdown", included: true },
      { text: "Cover letter generator", included: true },
      { text: "Master CV storage", included: true },
      { text: "Dashboard + history", included: true },
      { text: "Priority processing", included: true },
    ],
    button: {
      monthlyText: "Go Pro monthly (R99/mo)",
      yearlyText: "Go Pro yearly (R799/yr)",
    },
  },
];

const Pricing2 = ({
  id,
  heading = "Free or Pro. Nothing in between.",
  description = "Two clear choices, no decision fatigue.",
  plans = defaultPlans,
  className,
  showRationale = true,
  onPlanSelect,
}: Pricing2Props) => {
  const [isYearly, setIsYearly] = useState(false);

  const billingCycle: BillingCycle = isYearly ? "yearly" : "monthly";

  return (
    <section id={id} className={cn("py-24 bg-white", className)}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-3">
          Pricing
        </p>
        <h2
          style={{ fontFamily: "'DM Serif Display', serif" }}
          className="text-3xl sm:text-4xl text-slate-900 text-center mb-4"
        >
          {heading}
        </h2>
        <p className="text-slate-500 text-center text-base mb-8">
          {description}
        </p>

        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span
              className={cn(
                "text-sm font-semibold transition-colors",
                isYearly ? "text-slate-400" : "text-slate-900",
              )}
            >
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              aria-label="Toggle yearly billing"
            />
            <span
              className={cn(
                "text-sm font-semibold transition-colors",
                isYearly ? "text-slate-900" : "text-slate-400",
              )}
            >
              Yearly
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isPro = plan.id === "pro";
            const isPopular = Boolean(plan.popular);
            const isLightCard = !isPopular;
            const currentPrice = isPro && isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const currentCadence = isPro && isYearly
              ? (plan.yearlyLabel ?? "/year")
              : (plan.monthlyLabel ?? "/month");
            const currentButtonText = isPro && isYearly
              ? (plan.button.yearlyText ?? plan.button.monthlyText)
              : plan.button.monthlyText;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1",
                  isPopular
                    ? "border-0 text-white shadow-[0_20px_60px_rgba(13,31,60,0.2)]"
                    : "border-slate-200 bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                )}
                style={
                  isPopular
                    ? { background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)" }
                    : undefined
                }
              >
                {isPopular && (
                  <div className="absolute top-4 right-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
                    >
                      Most popular
                    </span>
                  </div>
                )}

                <CardHeader className="space-y-4">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: isPopular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                    >
                      {plan.name}
                    </p>
                    <CardTitle
                      className={cn(
                        "text-4xl font-bold tracking-tight",
                        isPopular ? "text-white" : "text-[#0d1f3c]",
                      )}
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      {currentPrice}
                    </CardTitle>
                    <p
                      className="text-sm mt-1"
                      style={{ color: isPopular ? "rgba(255,255,255,0.5)" : "#94a3b8" }}
                    >
                      {currentCadence}
                    </p>
                  </div>

                  {plan.savings && (
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        isPopular ? "text-white/90" : "text-emerald-700",
                      )}
                    >
                      {isYearly ? plan.savings : "Prefer annual? Save 33% with yearly billing."}
                    </p>
                  )}

                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: isPopular ? "rgba(255,255,255,0.65)" : "#64748b" }}
                  >
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1">
                  <Separator
                    className={cn("mb-6", isPopular ? "bg-white/20" : "bg-slate-200")}
                  />
                  {plan.id === "pro" && (
                    <p className="mb-3 text-sm font-semibold text-white/85">
                      Everything in Free, and:
                    </p>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => {
                      const iconColor = feature.included
                        ? (isPopular ? "text-white/70" : "text-emerald-500")
                        : (isPopular ? "text-white/40" : "text-slate-400");
                      const textColor = feature.included
                        ? (isPopular ? "text-white/90" : "text-slate-700")
                        : (isPopular ? "text-white/50" : "text-slate-400");

                      return (
                        <li key={feature.text} className="flex items-center gap-2.5 text-sm">
                          {feature.included ? (
                            <CircleCheck className={cn("h-4 w-4 shrink-0", iconColor)} />
                          ) : (
                            <CircleX className={cn("h-4 w-4 shrink-0", iconColor)} />
                          )}
                          <span className={textColor}>{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button
                    type="button"
                    onClick={() => onPlanSelect?.(plan.id, plan.id === "pro" ? billingCycle : "monthly")}
                    className={cn(
                      "w-full rounded-xl py-3 text-sm font-semibold",
                      isLightCard
                        ? "bg-[linear-gradient(135deg,#0d1f3c,#1a3a6b)] text-white hover:opacity-95"
                        : "bg-white !text-black hover:bg-white/90 hover:!text-black",
                    )}
                  >
                    {currentButtonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {showRationale && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Why this structure works
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Free gives enough to see value, but not enough to stay free forever.</li>
              <li>R99/month is impulse-buy territory for active job seekers.</li>
              <li>R799/year works out to R67/month and rewards commitment.</li>
              <li>Annual billing improves cash flow and reduces churn.</li>
              <li>Two plans keeps decision-making simple: free or pro.</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

export { Pricing2 };
