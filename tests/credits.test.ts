import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeNextTailorUsage, creditActionForOutcome } from "../src/lib/user";
import type { UserCredits } from "../src/lib/types";

const freeUser = (count: number, reset: string): UserCredits => ({
  id: "user-1",
  email: "alex@example.com",
  plan: "free",
  tailor_count: count,
  tailor_reset_date: reset,
});

describe("credit handling", () => {
  it("does not charge when tailoring fails", () => {
    assert.equal(creditActionForOutcome(false, "failed"), "none");
    assert.equal(creditActionForOutcome(false, "success"), "deduct");
    assert.equal(creditActionForOutcome(true, "success"), "none");
  });

  it("does not increment past the free monthly cap", () => {
    const now = new Date("2026-08-15T10:00:00Z");
    const decision = computeNextTailorUsage(freeUser(3, "2026-09-01T00:00:00Z"), now);
    assert.equal(decision.action, "deny");
  });

  it("resets the count after the monthly reset date", () => {
    const now = new Date("2026-09-02T10:00:00Z");
    const decision = computeNextTailorUsage(freeUser(3, "2026-09-01T00:00:00Z"), now);
    assert.equal(decision.action, "increment");
    if (decision.action === "increment") assert.equal(decision.tailor_count, 1);
  });

  it("is deterministic for the same user snapshot (no double increment in one decision)", () => {
    const now = new Date("2026-08-15T10:00:00Z");
    const user = freeUser(1, "2026-09-01T00:00:00Z");
    const a = computeNextTailorUsage(user, now);
    const b = computeNextTailorUsage(user, now);
    assert.deepEqual(a, b);
    if (a.action === "increment") assert.equal(a.tailor_count, 2);
  });
});
