import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createMemoryCreditStore } from "../src/lib/cv/credits";
import type { UserCredits } from "../src/lib/types";

const free = (count: number): UserCredits => ({
  id: "user-1",
  email: "alex@example.com",
  plan: "free",
  tailor_count: count,
  tailor_reset_date: "2026-10-01T00:00:00Z",
});

describe("atomic credit reservations", () => {
  it("allows at most one successful reservation when one credit remains", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(2)]]));
    const [a, b] = await Promise.all([
      store.reserve("user-1", "11111111-1111-1111-1111-111111111111", free(2)),
      store.reserve("user-1", "22222222-2222-2222-2222-222222222222", free(2)),
    ]);
    const successes = [a, b].filter((r) => r.ok);
    assert.equal(successes.length, 1);
    assert.equal(store.users.get("user-1")?.tailor_count, 3);
  });

  it("repeats the same request ID without a second charge", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(0)]]));
    const first = await store.reserve("user-1", "req-a", free(0));
    const second = await store.reserve("user-1", "req-a", store.users.get("user-1")!);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.idempotent, true);
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
  });

  it("refunds a reserved credit exactly once", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(0)]]));
    await store.reserve("user-1", "req-b", free(0));
    const first = await store.refund("req-b");
    const second = await store.refund("req-b");
    assert.equal(first.ok, true);
    assert.equal(second.idempotent, true);
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
  });

  it("consume after success does not change the count again", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(0)]]));
    await store.reserve("user-1", "req-c", free(0));
    await store.consume("req-c");
    await store.consume("req-c");
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
    const refund = await store.refund("req-c");
    assert.equal(refund.ok, false);
  });

  it("never stores a negative tailor_count on refund", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(0)]]));
    await store.reserve("user-1", "req-d", free(0));
    store.users.set("user-1", free(0));
    await store.refund("req-d");
    assert.ok((store.users.get("user-1")?.tailor_count ?? 0) >= 0);
  });

  it("re-reserves a refunded request ID without treating it as already completed", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", free(0)]]));
    await store.reserve("user-1", "req-e", free(0));
    await store.refund("req-e");
    const again = await store.reserve("user-1", "req-e", store.users.get("user-1")!);
    assert.equal(again.ok, true);
    assert.equal(again.status, "reserved");
    assert.equal(again.idempotent, undefined);
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
  });

  it("documents Postgres atomicity via FOR UPDATE and unique request_id", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260831_tailor_credit_reservations.sql"), "utf8");
    assert.match(sql, /request_id uuid primary key/);
    assert.match(sql, /for update/i);
    assert.match(sql, /reuse_refunded/);
    assert.match(sql, /reserve_tailor_credit/);
    assert.match(sql, /refund_tailor_credit/);
    assert.match(sql, /greatest\(coalesce\(tailor_count, 0\) - 1, 0\)/);
  });
});
