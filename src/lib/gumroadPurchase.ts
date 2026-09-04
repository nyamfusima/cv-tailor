import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeEmail,
  PAID_PLAN_CONFIG,
  planExpiresAt,
  resolveGumroadPlanType,
  type PaidPlanType,
} from "./purchases";

export type GumroadAuth = "ok" | "bad" | "fallback";

export interface GumroadPing {
  purchaserEmail: string;
  userEmail: string;
  accountEmail: string;
  emailsDiffer: boolean;
  productPermalink: string;
  productName: string;
  saleId: string;
  refunded: boolean;
  purchasedAt: string;
  buyerName: string;
  buyerEmail: string;
  salePrice: number;
  missingStableSaleId: boolean;
}

export interface AppUserRow {
  id: string;
  email: string;
  plan: string;
  plan_type: string | null;
  plan_expires_at: string | null;
  tailor_count: number;
}

export interface PendingPurchaseRow {
  plan_type: string;
  user_id: string | null;
  email: string;
}

export interface CreditGrantRow {
  sale_id: string;
  user_id: string;
  account_email: string;
  plan_type: string;
  entitlement: "unlimited_pro";
  credits_delta: number;
  audit_reason: string | null;
}

export interface ConfirmedPurchaseRow {
  purchase_id: string;
  user_id: string | null;
  plan_type: string;
  item_name: string | null;
  buyer_name: string | null;
  purchase_email: string;
  buyer_email: string | null;
  user_email: string;
  purchased_at: string;
  subscription_end_date: string | null;
  sale_price: number;
  refunded: boolean;
}

export interface UnmatchedPurchaseRow {
  sale_id: string;
  purchaser_email: string;
  account_email: string;
  product_permalink: string;
  product_name: string;
  reason: string;
}

export interface EmailMismatchRow {
  sale_id: string;
  user_email: string;
  purchaser_email: string;
  resolved_user_id: string | null;
}

export interface ApplyGrantInput {
  saleId: string;
  userId: string;
  accountEmail: string;
  planType: PaidPlanType;
  purchasedAt: string;
  expiresAt: string;
  itemName: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  salePrice: number;
  auditReason?: string | null;
}

export type ApplyGrantResult =
  | {
      ok: true;
      alreadyProcessed: boolean;
      userId: string;
      creditsGranted: "unlimited" | 0;
      entitlement: "unlimited_pro";
      expiresAt: string;
    }
  | { ok: false; error: string };

export interface PurchaseStore {
  transact<T>(fn: (tx: PurchaseStore) => Promise<T>): Promise<T>;
  findPending(email: string): Promise<PendingPurchaseRow | null>;
  findUsersByEmail(email: string): Promise<AppUserRow[]>;
  findUserById(id: string): Promise<AppUserRow | null>;
  getGrant(saleId: string): Promise<CreditGrantRow | null>;
  getPurchase(saleId: string): Promise<ConfirmedPurchaseRow | null>;
  applyGrant(input: ApplyGrantInput): Promise<ApplyGrantResult>;
  insertUnmatched(row: UnmatchedPurchaseRow): Promise<void>;
  insertEmailMismatch(row: EmailMismatchRow): Promise<void>;
  deletePending(userId: string, email: string): Promise<void>;
  downgradeUser(userId: string): Promise<void>;
  markPurchaseRefunded(saleId: string): Promise<void>;
}

export type GumroadLogEvent =
  | "webhook_received"
  | "duplicate_event_skipped"
  | "user_not_found"
  | "email_mismatch"
  | "credit_allocation_attempted"
  | "credit_allocation_completed"
  | "database_error"
  | "unmatched_purchase"
  | "refund_processed"
  | "unknown_plan";

export type GumroadLogger = (event: GumroadLogEvent, fields: Record<string, unknown>) => void;

export function defaultGumroadLogger(event: GumroadLogEvent, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ msg: "gumroad_webhook", event, ...fields }));
}

function firstNonEmpty(params: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) return value;
  }
  return "";
}

function valueFromUnknown(source: unknown, keys: string[]): string {
  if (!source) return "";
  if (typeof source === "string") {
    try {
      return valueFromUnknown(JSON.parse(source), keys);
    } catch {
      const nested = new URLSearchParams(source);
      return firstNonEmpty(nested, keys);
    }
  }
  if (typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function parseGumroadPing(rawBody: string): URLSearchParams {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(json)) {
        if (value == null) continue;
        params.set(key, typeof value === "string" ? value : JSON.stringify(value));
      }
      return params;
    } catch {
      // Live Gumroad pings are form-encoded; fall through.
    }
  }
  return new URLSearchParams(rawBody);
}

export function extractGumroadPing(params: URLSearchParams): GumroadPing {
  const purchaserEmail = normalizeEmail(
    firstNonEmpty(params, ["email", "buyer_email", "purchaser_email"]),
  );
  const nestedUserEmail = [
    valueFromUnknown(params.get("url_params"), ["user_email", "email"]),
    valueFromUnknown(params.get("custom_fields"), ["user_email", "User email", "email"]),
  ].find((value) => value.trim()) || "";
  const userEmail = normalizeEmail(
    firstNonEmpty(params, ["user_email", "url_params[user_email]", "custom_fields[user_email]"]) ||
      nestedUserEmail,
  );
  const accountEmail = userEmail || purchaserEmail;
  const saleId = firstNonEmpty(params, ["sale_id", "purchase_id"]);
  const purchasedRaw = firstNonEmpty(params, ["sale_timestamp", "created_at"]) || new Date().toISOString();
  const purchasedAt = new Date(purchasedRaw);
  return {
    purchaserEmail,
    userEmail,
    accountEmail,
    emailsDiffer: Boolean(userEmail && purchaserEmail && userEmail !== purchaserEmail),
    productPermalink: firstNonEmpty(params, ["short_product_id", "product_permalink", "permalink"]),
    productName: firstNonEmpty(params, ["product_name"]),
    saleId,
    refunded: params.get("refunded") === "true",
    purchasedAt: Number.isNaN(purchasedAt.getTime()) ? new Date().toISOString() : purchasedAt.toISOString(),
    buyerName: firstNonEmpty(params, ["full_name", "buyer_name"]),
    buyerEmail: normalizeEmail(firstNonEmpty(params, ["buyer_email", "email"])) || purchaserEmail,
    salePrice: Number(firstNonEmpty(params, ["price", "sale_price"]) || 0),
    missingStableSaleId: !saleId,
  };
}

export interface ProcessGumroadOptions {
  auth: GumroadAuth;
  monthlyPermalink?: string | null;
  yearlyPermalink?: string | null;
  logger?: GumroadLogger;
}

export interface ProcessGumroadResult {
  status: number;
  body: Record<string, unknown>;
}

async function resolveAccountUser(
  store: PurchaseStore,
  accountEmail: string,
  pendingUserId?: string | null,
): Promise<{ user: AppUserRow | null; ambiguous: boolean }> {
  if (pendingUserId) {
    const byId = await store.findUserById(pendingUserId);
    if (byId) return { user: byId, ambiguous: false };
  }
  const matches = await store.findUsersByEmail(accountEmail);
  if (matches.length > 1) return { user: null, ambiguous: true };
  return { user: matches[0] ?? null, ambiguous: false };
}

export async function processGumroadSale(
  store: PurchaseStore,
  ping: GumroadPing,
  options: ProcessGumroadOptions,
): Promise<ProcessGumroadResult> {
  const log = options.logger ?? defaultGumroadLogger;
  log("webhook_received", {
    saleId: ping.saleId || null,
    productPermalink: ping.productPermalink || null,
    accountEmail: ping.accountEmail || null,
    missingStableSaleId: ping.missingStableSaleId,
  });

  if (!ping.accountEmail) {
    return { status: 400, body: { error: "No email" } };
  }

  const pending =
    (await store.findPending(ping.accountEmail)) ||
    (ping.purchaserEmail && ping.purchaserEmail !== ping.accountEmail
      ? await store.findPending(ping.purchaserEmail)
      : null);

  if (options.auth === "fallback" && !pending && !ping.refunded) {
    const existing = await store.findUsersByEmail(ping.accountEmail);
    if (existing.length === 0) {
      log("user_not_found", { accountEmail: ping.accountEmail, saleId: ping.saleId || null, reason: "fallback_no_pending" });
      return { status: 401, body: { error: "Invalid signature" } };
    }
  }

  if (ping.emailsDiffer) {
    log("email_mismatch", {
      saleId: ping.saleId || null,
      userEmail: ping.userEmail,
      purchaserEmail: ping.purchaserEmail,
    });
    await store.insertEmailMismatch({
      sale_id: ping.saleId || `unknown-${ping.accountEmail}-${ping.purchasedAt}`,
      user_email: ping.userEmail,
      purchaser_email: ping.purchaserEmail,
      resolved_user_id: null,
    });
  }

  const { user, ambiguous } = await resolveAccountUser(store, ping.accountEmail, pending?.user_id);

  if (ping.refunded) {
    if (user) await store.downgradeUser(user.id);
    if (ping.saleId) await store.markPurchaseRefunded(ping.saleId);
    log("refund_processed", { accountEmail: ping.accountEmail, userId: user?.id ?? null, saleId: ping.saleId || null });
    return { status: 200, body: { success: true, refunded: true } };
  }

  const planType = resolveGumroadPlanType({
    permalink: ping.productPermalink,
    productName: ping.productName,
    pendingPlanType: pending?.plan_type,
    monthlyPermalink: options.monthlyPermalink,
    yearlyPermalink: options.yearlyPermalink,
  });

  if (!planType) {
    log("unknown_plan", { accountEmail: ping.accountEmail, productPermalink: ping.productPermalink });
    return { status: 400, body: { error: "Unknown plan" } };
  }

  const saleId = ping.saleId || `gumroad-unidentified-${ping.accountEmail}-${Date.parse(ping.purchasedAt)}`;

  if (ambiguous) {
    log("database_error", { accountEmail: ping.accountEmail, error: "multiple_users_for_email" });
    await store.insertUnmatched({
      sale_id: saleId,
      purchaser_email: ping.purchaserEmail,
      account_email: ping.accountEmail,
      product_permalink: ping.productPermalink,
      product_name: ping.productName,
      reason: "multiple_users_for_email",
    });
    return { status: 409, body: { error: "ambiguous_user", status: "pending_reconciliation" } };
  }

  if (!user) {
    log("user_not_found", { accountEmail: ping.accountEmail, saleId, pendingUserId: pending?.user_id ?? null });
    await store.insertUnmatched({
      sale_id: saleId,
      purchaser_email: ping.purchaserEmail,
      account_email: ping.accountEmail,
      product_permalink: ping.productPermalink,
      product_name: ping.productName,
      reason: "user_not_found",
    });
    return {
      status: 200,
      body: { ok: false, status: "pending_reconciliation", error: "User not found" },
    };
  }

  const existingGrant = await store.getGrant(saleId);
  if (existingGrant) {
    log("duplicate_event_skipped", {
      saleId,
      userId: existingGrant.user_id,
      accountEmail: ping.accountEmail,
    });
    return {
      status: 200,
      body: {
        success: true,
        alreadyProcessed: true,
        userId: existingGrant.user_id,
        creditsGranted: 0,
      },
    };
  }

  const expiresAt = planExpiresAt(planType, new Date(ping.purchasedAt));
  log("credit_allocation_attempted", {
    saleId,
    userId: user.id,
    accountEmail: ping.accountEmail,
    planType,
    entitlement: PAID_PLAN_CONFIG[planType].tailorCredits,
    existingSubscriptionId: (await store.getPurchase(saleId))?.purchase_id ?? null,
  });

  try {
    const granted = await store.transact((tx) =>
      tx.applyGrant({
        saleId,
        userId: user.id,
        accountEmail: user.email || ping.accountEmail,
        planType,
        purchasedAt: ping.purchasedAt,
        expiresAt,
        itemName: ping.productName || ping.productPermalink || planType,
        buyerName: ping.buyerName || null,
        buyerEmail: ping.buyerEmail || ping.purchaserEmail || null,
        salePrice: ping.salePrice,
        auditReason: ping.missingStableSaleId
          ? "Gumroad ping lacked a stable sale_id; derived idempotency key used."
          : null,
      }),
    );

    if (!granted.ok) {
      log("database_error", { saleId, userId: user.id, error: granted.error });
      return { status: 500, body: { error: granted.error } };
    }

    await store.deletePending(user.id, ping.accountEmail);
    if (ping.purchaserEmail && ping.purchaserEmail !== ping.accountEmail) {
      await store.deletePending(user.id, ping.purchaserEmail);
    }

    log("credit_allocation_completed", {
      saleId,
      userId: user.id,
      accountEmail: ping.accountEmail,
      alreadyProcessed: granted.alreadyProcessed,
      creditsGranted: granted.alreadyProcessed ? 0 : granted.creditsGranted,
      expiresAt: granted.expiresAt,
    });

    return {
      status: 200,
      body: {
        success: true,
        alreadyProcessed: granted.alreadyProcessed,
        userId: user.id,
        creditsGranted: granted.alreadyProcessed ? 0 : granted.creditsGranted,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "database_error";
    log("database_error", { saleId, userId: user.id, error: message });
    return { status: 500, body: { error: message } };
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMemoryPurchaseStore(seed?: {
  users?: AppUserRow[];
  pending?: PendingPurchaseRow[];
  failBeforeCredits?: boolean;
}): PurchaseStore & {
  users: Map<string, AppUserRow>;
  purchases: Map<string, ConfirmedPurchaseRow>;
  grants: Map<string, CreditGrantRow>;
  unmatched: UnmatchedPurchaseRow[];
  mismatches: EmailMismatchRow[];
} {
  const users = new Map((seed?.users ?? []).map((user) => [user.id, cloneJson(user)]));
  const pending = [...(seed?.pending ?? [])];
  const purchases = new Map<string, ConfirmedPurchaseRow>();
  const grants = new Map<string, CreditGrantRow>();
  const unmatched: UnmatchedPurchaseRow[] = [];
  const mismatches: EmailMismatchRow[] = [];

  const snapshot = () => ({
    users: cloneJson([...users.entries()]),
    pending: cloneJson(pending),
    purchases: cloneJson([...purchases.entries()]),
    grants: cloneJson([...grants.entries()]),
    unmatched: cloneJson(unmatched),
    mismatches: cloneJson(mismatches),
  });

  const restore = (snap: ReturnType<typeof snapshot>) => {
    users.clear();
    for (const [id, user] of snap.users) users.set(id, user);
    pending.splice(0, pending.length, ...snap.pending);
    purchases.clear();
    for (const [id, row] of snap.purchases) purchases.set(id, row);
    grants.clear();
    for (const [id, row] of snap.grants) grants.set(id, row);
    unmatched.splice(0, unmatched.length, ...snap.unmatched);
    mismatches.splice(0, mismatches.length, ...snap.mismatches);
  };

  const store: PurchaseStore & {
    users: Map<string, AppUserRow>;
    purchases: Map<string, ConfirmedPurchaseRow>;
    grants: Map<string, CreditGrantRow>;
    unmatched: UnmatchedPurchaseRow[];
    mismatches: EmailMismatchRow[];
  } = {
    users,
    purchases,
    grants,
    unmatched,
    mismatches,
    async transact(fn) {
      const snap = snapshot();
      try {
        return await fn(store);
      } catch (error) {
        restore(snap);
        throw error;
      }
    },
    async findPending(email) {
      const needle = normalizeEmail(email);
      return pending.find((row) => normalizeEmail(row.email) === needle) ?? null;
    },
    async findUsersByEmail(email) {
      const needle = normalizeEmail(email);
      return [...users.values()].filter((user) => normalizeEmail(user.email) === needle);
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async getGrant(saleId) {
      return grants.get(saleId) ?? null;
    },
    async getPurchase(saleId) {
      return purchases.get(saleId) ?? null;
    },
    async applyGrant(input) {
      const existing = grants.get(input.saleId);
      if (existing) {
        return {
          ok: true,
          alreadyProcessed: true,
          userId: existing.user_id,
          creditsGranted: 0,
          entitlement: "unlimited_pro",
          expiresAt: purchases.get(input.saleId)?.subscription_end_date || input.expiresAt,
        };
      }
      const user = users.get(input.userId);
      if (!user) return { ok: false, error: "user_not_found" };

      const nextUser: AppUserRow = {
        ...user,
        plan: "pro",
        plan_type: input.planType,
        plan_expires_at: input.expiresAt,
      };
      users.set(user.id, nextUser);
      purchases.set(input.saleId, {
        purchase_id: input.saleId,
        user_id: user.id,
        plan_type: input.planType,
        item_name: input.itemName,
        buyer_name: input.buyerName,
        purchase_email: input.accountEmail,
        buyer_email: input.buyerEmail,
        user_email: input.accountEmail,
        purchased_at: input.purchasedAt,
        subscription_end_date: input.expiresAt,
        sale_price: input.salePrice,
        refunded: false,
      });
      if (seed?.failBeforeCredits) {
        throw new Error("simulated_credit_failure");
      }
      grants.set(input.saleId, {
        sale_id: input.saleId,
        user_id: user.id,
        account_email: input.accountEmail,
        plan_type: input.planType,
        entitlement: "unlimited_pro",
        credits_delta: 0,
        audit_reason: input.auditReason ?? null,
      });
      return {
        ok: true,
        alreadyProcessed: false,
        userId: user.id,
        creditsGranted: "unlimited",
        entitlement: "unlimited_pro",
        expiresAt: input.expiresAt,
      };
    },
    async insertUnmatched(row) {
      if (!unmatched.some((item) => item.sale_id === row.sale_id)) unmatched.push(row);
    },
    async insertEmailMismatch(row) {
      mismatches.push(row);
    },
    async deletePending(userId, email) {
      const needle = normalizeEmail(email);
      for (let i = pending.length - 1; i >= 0; i -= 1) {
        if (pending[i].user_id === userId || normalizeEmail(pending[i].email) === needle) {
          pending.splice(i, 1);
        }
      }
    },
    async downgradeUser(userId) {
      const user = users.get(userId);
      if (user) users.set(userId, { ...user, plan: "free" });
    },
    async markPurchaseRefunded(saleId) {
      const purchase = purchases.get(saleId);
      if (purchase) purchases.set(saleId, { ...purchase, refunded: true });
    },
  };

  return store;
}

function isMissingRpc(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42883" || /apply_pro_purchase/i.test(error.message);
}

async function sequentialApplyGrant(admin: SupabaseClient, input: ApplyGrantInput): Promise<ApplyGrantResult> {
  const { data: existingGrant } = await admin
    .from("purchase_credit_grants")
    .select("sale_id, user_id, account_email, plan_type, entitlement, credits_delta, audit_reason")
    .eq("sale_id", input.saleId)
    .maybeSingle();
  if (existingGrant) {
    return {
      ok: true,
      alreadyProcessed: true,
      userId: existingGrant.user_id,
      creditsGranted: 0,
      entitlement: "unlimited_pro",
      expiresAt: input.expiresAt,
    };
  }

  const { data: previous } = await admin
    .from("users")
    .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
    .eq("id", input.userId)
    .maybeSingle();
  if (!previous) return { ok: false, error: "user_not_found" };

  const { data: updated, error: planError } = await admin
    .from("users")
    .update({
      plan: "pro",
      plan_type: input.planType,
      plan_expires_at: input.expiresAt,
    })
    .eq("id", input.userId)
    .select("id")
    .maybeSingle();
  if (planError) return { ok: false, error: planError.message };
  if (!updated) return { ok: false, error: "user_not_found" };

  const { error: purchaseError } = await admin.from("confirmed_purchases").upsert(
    {
      purchase_id: input.saleId,
      user_id: input.userId,
      plan_type: input.planType,
      item_name: input.itemName,
      buyer_name: input.buyerName,
      purchase_email: input.accountEmail,
      buyer_email: input.buyerEmail,
      user_email: input.accountEmail,
      purchased_at: input.purchasedAt,
      subscription_end_date: input.expiresAt,
      sale_price: input.salePrice,
      refunded: false,
      fully_refunded: false,
      disputed: false,
      access_revoked: false,
    },
    { onConflict: "purchase_id" },
  );

  if (purchaseError) {
    await admin
      .from("users")
      .update({
        plan: previous.plan,
        plan_type: previous.plan_type,
        plan_expires_at: previous.plan_expires_at,
      })
      .eq("id", input.userId);
    return { ok: false, error: purchaseError.message };
  }

  const { error: grantError } = await admin.from("purchase_credit_grants").insert({
    sale_id: input.saleId,
    user_id: input.userId,
    account_email: input.accountEmail,
    plan_type: input.planType,
    entitlement: "unlimited_pro",
    credits_delta: 0,
    audit_reason: input.auditReason ?? null,
  });

  if (grantError) {
    if (/duplicate|unique/i.test(grantError.message)) {
      return {
        ok: true,
        alreadyProcessed: true,
        userId: input.userId,
        creditsGranted: 0,
        entitlement: "unlimited_pro",
        expiresAt: input.expiresAt,
      };
    }
    await admin
      .from("users")
      .update({
        plan: previous.plan,
        plan_type: previous.plan_type,
        plan_expires_at: previous.plan_expires_at,
      })
      .eq("id", input.userId);
    return { ok: false, error: grantError.message };
  }

  return {
    ok: true,
    alreadyProcessed: false,
    userId: input.userId,
    creditsGranted: "unlimited",
    entitlement: "unlimited_pro",
    expiresAt: input.expiresAt,
  };
}

function parseRpcGrant(data: unknown, fallbackExpiresAt: string): ApplyGrantResult {
  const rec = (data ?? {}) as Record<string, unknown>;
  if (rec.ok === false) return { ok: false, error: String(rec.error || "apply_pro_purchase_failed") };
  return {
    ok: true,
    alreadyProcessed: Boolean(rec.alreadyProcessed),
    userId: String(rec.userId || rec.user_id || ""),
    creditsGranted: rec.alreadyProcessed ? 0 : "unlimited",
    entitlement: "unlimited_pro",
    expiresAt: String(rec.expiresAt || rec.expires_at || fallbackExpiresAt),
  };
}

export function createSupabasePurchaseStore(admin: SupabaseClient): PurchaseStore {
  return {
    async transact(fn) {
      return fn(this);
    },
    async findPending(email) {
      const needle = normalizeEmail(email);
      const { data } = await admin
        .from("pending_purchases")
        .select("plan_type, user_id, email, created_at")
        .ilike("email", needle)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    async findUsersByEmail(email) {
      const needle = normalizeEmail(email);
      const { data, error } = await admin
        .from("users")
        .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
        .ilike("email", needle);
      if (error) throw new Error(error.message);
      return (data ?? []) as AppUserRow[];
    },
    async findUserById(id) {
      const { data, error } = await admin
        .from("users")
        .select("id, email, plan, plan_type, plan_expires_at, tailor_count")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as AppUserRow | null) ?? null;
    },
    async getGrant(saleId) {
      const { data } = await admin
        .from("purchase_credit_grants")
        .select("sale_id, user_id, account_email, plan_type, entitlement, credits_delta, audit_reason")
        .eq("sale_id", saleId)
        .maybeSingle();
      return (data as CreditGrantRow | null) ?? null;
    },
    async getPurchase(saleId) {
      const { data } = await admin
        .from("confirmed_purchases")
        .select("*")
        .eq("purchase_id", saleId)
        .maybeSingle();
      return (data as ConfirmedPurchaseRow | null) ?? null;
    },
    async applyGrant(input) {
      const { data, error } = await admin.rpc("apply_pro_purchase", {
        p_sale_id: input.saleId,
        p_user_id: input.userId,
        p_account_email: input.accountEmail,
        p_plan_type: input.planType,
        p_purchased_at: input.purchasedAt,
        p_expires_at: input.expiresAt,
        p_item_name: input.itemName,
        p_buyer_name: input.buyerName,
        p_buyer_email: input.buyerEmail,
        p_sale_price: input.salePrice,
        p_audit_reason: input.auditReason ?? null,
      });
      if (!error) return parseRpcGrant(data, input.expiresAt);
      if (!isMissingRpc(error)) return { ok: false, error: error.message };
      return sequentialApplyGrant(admin, input);
    },
    async insertUnmatched(row) {
      await admin.from("unmatched_purchases").upsert({ ...row }, { onConflict: "sale_id" });
    },
    async insertEmailMismatch(row) {
      await admin.from("purchase_email_mismatches").insert({ ...row });
    },
    async deletePending(userId, email) {
      await admin.from("pending_purchases").delete().eq("user_id", userId);
      await admin.from("pending_purchases").delete().ilike("email", normalizeEmail(email));
    },
    async downgradeUser(userId) {
      await admin.from("users").update({ plan: "free" }).eq("id", userId);
    },
    async markPurchaseRefunded(saleId) {
      await admin
        .from("confirmed_purchases")
        .update({ refunded: true, fully_refunded: true })
        .eq("purchase_id", saleId);
    },
  };
}
