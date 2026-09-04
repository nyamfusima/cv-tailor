import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gumroadPermalinkFromUrl,
  normalizeEmail,
  postgrestOrExact,
  remainingDashboardCredits,
  resolveGumroadPlanType,
  toAccountPlanResponse,
} from "../src/lib/purchases";

describe("Gumroad plan resolution", () => {
  it("reads the permalink slug from a Gumroad product URL", () => {
    assert.equal(gumroadPermalinkFromUrl("https://gumroad.com/l/pro-monthly"), "pro-monthly");
    assert.equal(gumroadPermalinkFromUrl("pro_yearly"), "pro_yearly");
  });

  it("uses the pending checkout plan when the ping permalink is opaque", () => {
    assert.equal(
      resolveGumroadPlanType({ permalink: "a1B2c3", pendingPlanType: "pro_yearly" }),
      "pro_yearly",
    );
  });

  it("maps configured product URLs onto monthly and yearly plans", () => {
    assert.equal(
      resolveGumroadPlanType({
        permalink: "https://example.gumroad.com/l/cv-month",
        monthlyPermalink: "https://example.gumroad.com/l/cv-month",
        yearlyPermalink: "https://example.gumroad.com/l/cv-year",
      }),
      "pro_monthly",
    );
    assert.equal(
      resolveGumroadPlanType({
        permalink: "cv-year",
        monthlyPermalink: "https://example.gumroad.com/l/cv-month",
        yearlyPermalink: "https://example.gumroad.com/l/cv-year",
      }),
      "pro_yearly",
    );
  });

  it("falls back to the product name when permalinks do not match", () => {
    assert.equal(resolveGumroadPlanType({ productName: "Pro Yearly" }), "pro_yearly");
    assert.equal(resolveGumroadPlanType({ productName: "Pro Monthly" }), "pro_monthly");
  });

  it("does not treat the university email as a hardcoded application account", () => {
    assert.equal(normalizeEmail("  JEPHTHA25@Gmail.com "), "jephtha25@gmail.com");
  });

  it("quotes emails so PostgREST does not split on @ or dots", () => {
    assert.equal(
      postgrestOrExact(["purchase_email", "user_email"], "jephtha25@gmail.com"),
      'purchase_email.eq."jephtha25@gmail.com",user_email.eq."jephtha25@gmail.com"',
    );
  });

  it("returns unlimited dashboard credits for Pro, not the free remaining count", () => {
    assert.equal(remainingDashboardCredits({ plan: "pro", tailor_count: 1 }), null);
    assert.equal(
      toAccountPlanResponse({
        plan: "pro",
        tailor_count: 1,
        tailor_reset_date: "2026-10-01T00:00:00Z",
      }).remaining_credits,
      null,
    );
    assert.equal(
      toAccountPlanResponse({
        plan: "free",
        tailor_count: 1,
        tailor_reset_date: "2026-10-01T00:00:00Z",
      }).remaining_credits,
      2,
    );
  });
});
