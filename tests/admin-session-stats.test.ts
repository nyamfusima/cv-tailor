import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_SESSION_LIST_LIMIT,
  SUPABASE_ROW_CAP,
  aggregateSessionStats,
  fetchAllPaged,
  startOfTodayJohannesburg,
} from "../src/lib/admin/sessionStats";

describe("admin session stats", () => {
  it("does not treat a 1000-row page as the total tailor count", () => {
    const page = Array.from({ length: SUPABASE_ROW_CAP }, (_, i) => ({
      user_email: `user-${i}@example.com`,
      match_score: 70,
    }));
    const stats = aggregateSessionStats({
      totalSessions: 1847,
      todaySessions: 12,
      listedSessions: page.length,
      rows: page.concat([
        { user_email: "older@example.com", match_score: 90 },
      ]),
    });
    assert.equal(stats.totalSessions, 1847);
    assert.notEqual(stats.totalSessions, SUPABASE_ROW_CAP);
    assert.equal(stats.totalUsers, 1001);
    assert.equal(stats.todaySessions, 12);
    assert.equal(stats.listedSessions, ADMIN_SESSION_LIST_LIMIT);
  });

  it("pages past the Supabase 1000-row cap", async () => {
    const all = Array.from({ length: 1005 }, (_, i) => i);
    const seen: Array<[number, number]> = [];
    const rows = await fetchAllPaged(async (from, to) => {
      seen.push([from, to]);
      return all.slice(from, to + 1);
    });
    assert.equal(rows.length, 1005);
    assert.deepEqual(seen[0], [0, 999]);
    assert.deepEqual(seen[1], [1000, 1999]);
  });

  it("uses Johannesburg midnight for the today filter", () => {
    const start = startOfTodayJohannesburg(new Date("2026-08-31T22:30:00.000Z"));
    assert.equal(start, "2026-09-01T00:00:00+02:00");
  });
});
