import type { UserCredits } from "../types";
import { computeNextTailorUsage } from "../user";

export type CreditReservationStatus = "reserved" | "consumed" | "refunded";

export interface ReserveResult {
  ok: boolean;
  status?: CreditReservationStatus;
  idempotent?: boolean;
  error?: string;
  tailorCount?: number;
}

export interface RefundResult {
  ok: boolean;
  status?: CreditReservationStatus;
  idempotent?: boolean;
  error?: string;
}

export interface CreditStore {
  reserve(userId: string, requestId: string, user: UserCredits): Promise<ReserveResult>;
  consume(requestId: string): Promise<RefundResult>;
  refund(requestId: string): Promise<RefundResult>;
}

type Row = {
  requestId: string;
  userId: string;
  status: CreditReservationStatus;
};

/**
 * In-memory replica of the Postgres RPCs for tests.
 * Production uses `supabase/migrations/20260831_tailor_credit_reservations.sql`.
 */
export function createMemoryCreditStore(
  users: Map<string, UserCredits> = new Map(),
): CreditStore & { users: Map<string, UserCredits> } {
  const rows = new Map<string, Row>();
  let lock: Promise<void> = Promise.resolve();

  function withLock<T>(fn: () => T): Promise<T> {
    const run = lock.then(() => fn());
    lock = run.then(() => undefined, () => undefined);
    return run;
  }

  return {
    users,
    reserve(userId, requestId, snapshot) {
      return withLock(() => {
        const existing = rows.get(requestId);
        if (existing && existing.status !== "refunded") {
          return { ok: true, status: existing.status, idempotent: true, tailorCount: users.get(userId)?.tailor_count };
        }
        const current = users.get(userId) ?? snapshot;
        const decision = computeNextTailorUsage(current);
        if (decision.action === "deny") {
          return { ok: false, error: "no_credits" };
        }
        if (decision.action === "increment") {
          users.set(userId, {
            ...current,
            tailor_count: decision.tailor_count,
            tailor_reset_date: decision.tailor_reset_date ?? current.tailor_reset_date,
          });
        } else {
          users.set(userId, current);
        }
        rows.set(requestId, { requestId, userId, status: "reserved" });
        return { ok: true, status: "reserved", tailorCount: users.get(userId)?.tailor_count };
      });
    },
    consume(requestId) {
      return withLock(() => {
        const row = rows.get(requestId);
        if (!row) return { ok: false, error: "not_found" };
        if (row.status === "consumed") return { ok: true, status: "consumed", idempotent: true };
        if (row.status === "refunded") return { ok: false, error: "already_refunded" };
        row.status = "consumed";
        return { ok: true, status: "consumed" };
      });
    },
    refund(requestId) {
      return withLock(() => {
        const row = rows.get(requestId);
        if (!row) return { ok: false, error: "not_found" };
        if (row.status === "refunded") return { ok: true, status: "refunded", idempotent: true };
        if (row.status === "consumed") return { ok: false, error: "already_consumed" };
        row.status = "refunded";
        const user = users.get(row.userId);
        if (user && user.plan !== "pro" && user.tailor_count > 0) {
          users.set(row.userId, { ...user, tailor_count: user.tailor_count - 1 });
        }
        return { ok: true, status: "refunded" };
      });
    },
  };
}

export function createSupabaseCreditStore(admin: {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}): CreditStore {
  return {
    async reserve(userId, requestId) {
      const { data, error } = await admin.rpc("reserve_tailor_credit", {
        p_user_id: userId,
        p_request_id: requestId,
      });
      if (error) return { ok: false, error: error.message };
      const rec = (data ?? {}) as ReserveResult;
      if (rec.ok === false) return rec;
      return { ...rec, ok: true };
    },
    async consume(requestId) {
      const { data, error } = await admin.rpc("consume_tailor_credit", { p_request_id: requestId });
      if (error) return { ok: false, error: error.message };
      return (data ?? { ok: true }) as RefundResult;
    },
    async refund(requestId) {
      const { data, error } = await admin.rpc("refund_tailor_credit", { p_request_id: requestId });
      if (error) return { ok: false, error: error.message };
      return (data ?? { ok: true }) as RefundResult;
    },
  };
}
