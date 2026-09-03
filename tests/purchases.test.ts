import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gumroadPermalinkFromUrl, MANUAL_PRO_GRANTS, resolveGumroadPlanType } from "../src/lib/purchases";

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

  it("keeps Monique on a manual Pro grant until the webhook is replayed", () => {
    assert.equal(MANUAL_PRO_GRANTS["3810895@myuwc.ac.za"]?.buyerName, "Monique");
    assert.equal(MANUAL_PRO_GRANTS["3810895@myuwc.ac.za"]?.planType, "pro_monthly");
  });
});
