import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractGumroadPing,
  parseGumroadPing,
  processGumroadSale,
  createMemoryPurchaseStore,
  type AppUserRow,
} from "../src/lib/gumroadPurchase";
import { remainingDashboardCredits, toAccountPlanResponse } from "../src/lib/purchases";

const GMAIL = "jephtha25@gmail.com";
const UNIVERSITY = "3810895@myuwc.ac.za";
const SALE_ID = "gumroad-sale-monique-2026-09-03";
const PURCHASED_AT = "2026-09-03T09:29:00.000Z";

function user(id: string, email: string, extras: Partial<AppUserRow> = {}): AppUserRow {
  return {
    id,
    email,
    plan: "free",
    plan_type: null,
    plan_expires_at: null,
    tailor_count: 1,
    ...extras,
  };
}

function formBody(overrides: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    email: GMAIL,
    user_email: GMAIL,
    buyer_email: GMAIL,
    sale_id: SALE_ID,
    product_name: "Pro Monthly",
    short_product_id: "pro_monthly",
    sale_timestamp: PURCHASED_AT,
    price: "9897",
    full_name: "Monique Jephtha",
    ...overrides,
  });
  return params.toString();
}

async function processForm(
  store: ReturnType<typeof createMemoryPurchaseStore>,
  body: string,
  auth: "ok" | "fallback" = "ok",
) {
  const ping = extractGumroadPing(parseGumroadPing(body));
  return processGumroadSale(store, ping, {
    auth,
    monthlyPermalink: "https://gumroad.com/l/pro_monthly",
    yearlyPermalink: "https://gumroad.com/l/pro_yearly",
    logger: () => undefined,
  });
}

describe("Gumroad Pro Monthly webhook credits", () => {
  it("parses a form-encoded ping and grants Pro to the Gmail user", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL), user("uwc-user", UNIVERSITY)],
    });
    const result = await processForm(store, formBody());
    const gmail = store.users.get("gmail-user")!;
    const uwc = store.users.get("uwc-user")!;

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.userId, "gmail-user");
    assert.equal(gmail.plan, "pro");
    assert.equal(gmail.plan_type, "pro_monthly");
    assert.equal(gmail.tailor_count, 1);
    assert.ok(gmail.plan_expires_at && new Date(gmail.plan_expires_at) > new Date(PURCHASED_AT));
    assert.equal(store.grants.size, 1);
    assert.equal(store.purchases.get(SALE_ID)?.user_id, "gmail-user");
    assert.equal(uwc.plan, "free");
    assert.equal(uwc.plan_expires_at, null);

    const dashboard = toAccountPlanResponse({
      ...gmail,
      tailor_reset_date: "2026-10-01T00:00:00Z",
    });
    assert.equal(dashboard.plan, "pro");
    assert.equal(dashboard.credits_unlimited, true);
    assert.equal(dashboard.remaining_credits, null);
    assert.notEqual(dashboard.remaining_credits, 2);
  });

  it("is idempotent: a second identical ping grants zero extra credits", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL)],
    });
    const first = await processForm(store, formBody());
    const second = await processForm(store, formBody());
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.alreadyProcessed, true);
    assert.equal(second.body.creditsGranted, 0);
    assert.equal(store.grants.size, 1);
    assert.equal(store.purchases.size, 1);
    assert.equal(store.users.get("gmail-user")?.plan, "pro");
  });

  it("normalizes uppercase and whitespace in user_email", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL)],
    });
    const result = await processForm(
      store,
      formBody({ user_email: "  JEPHTHA25@GMAIL.COM ", email: "JEPHTHA25@gmail.com" }),
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.userId, "gmail-user");
    assert.equal(store.users.get("gmail-user")?.plan, "pro");
  });

  it("does not allocate credits to the purchaser when user_email belongs to someone else", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL), user("uwc-user", UNIVERSITY)],
    });
    const result = await processForm(
      store,
      formBody({ user_email: GMAIL, email: UNIVERSITY, buyer_email: UNIVERSITY }),
    );
    assert.equal(result.status, 200);
    assert.equal(store.users.get("gmail-user")?.plan, "pro");
    assert.equal(store.users.get("uwc-user")?.plan, "free");
    assert.equal(store.mismatches.some((row) => row.user_email === GMAIL && row.purchaser_email === UNIVERSITY), true);
    assert.equal(store.purchases.get(SALE_ID)?.user_id, "gmail-user");
  });

  it("records an unmatched purchase instead of creating a profile", async () => {
    const store = createMemoryPurchaseStore({ users: [user("uwc-user", UNIVERSITY)] });
    const result = await processForm(store, formBody());
    assert.equal(result.status, 200);
    assert.equal(result.body.status, "pending_reconciliation");
    assert.equal(store.users.size, 1);
    assert.equal(store.users.get("uwc-user")?.plan, "free");
    assert.equal(store.grants.size, 0);
    assert.equal(store.unmatched.length, 1);
    assert.equal(store.unmatched[0].account_email, GMAIL);
  });

  it("does not affect an unrelated university account when purchasing as the Gmail user", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL), user("uwc-user", UNIVERSITY, { plan: "free", tailor_count: 0 })],
    });
    await processForm(store, formBody({ user_email: GMAIL, email: GMAIL }));
    assert.equal(store.users.get("gmail-user")?.plan, "pro");
    assert.equal(store.users.get("uwc-user")?.plan, "free");
    assert.equal(store.users.get("uwc-user")?.tailor_count, 0);
    assert.equal([...store.purchases.values()].every((row) => row.user_id === "gmail-user"), true);
  });

  it("rolls back the subscription when credit allocation fails", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL)],
      failBeforeCredits: true,
    });
    const result = await processForm(store, formBody());
    assert.equal(result.status, 500);
    assert.equal(store.users.get("gmail-user")?.plan, "free");
    assert.equal(store.purchases.size, 0);
    assert.equal(store.grants.size, 0);
  });

  it("applies exactly one new cycle on renewal and ignores a duplicate delivery", async () => {
    const store = createMemoryPurchaseStore({
      users: [user("gmail-user", GMAIL)],
    });
    const first = await processForm(store, formBody());
    const renewalId = "gumroad-sale-monique-renewal";
    const second = await processForm(
      store,
      formBody({ sale_id: renewalId, sale_timestamp: "2026-10-03T09:29:00.000Z" }),
    );
    const duplicate = await processForm(
      store,
      formBody({ sale_id: renewalId, sale_timestamp: "2026-10-03T09:29:00.000Z" }),
    );
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.alreadyProcessed, false);
    assert.equal(duplicate.body.alreadyProcessed, true);
    assert.equal(duplicate.body.creditsGranted, 0);
    assert.equal(store.grants.size, 2);
    assert.equal(store.purchases.size, 2);
    assert.equal(store.users.get("gmail-user")?.plan, "pro");
    const renewalExpiry = new Date(store.users.get("gmail-user")?.plan_expires_at || 0);
    assert.ok(renewalExpiry.getTime() > Date.parse("2026-10-03T09:29:00.000Z"));
  });

  it("reads user_email from nested Gumroad url_params", () => {
    const body = new URLSearchParams({
      email: UNIVERSITY,
      url_params: JSON.stringify({ user_email: "  JEPHTHA25@GMAIL.COM " }),
      sale_id: SALE_ID,
      product_name: "Pro Monthly",
    }).toString();
    const ping = extractGumroadPing(parseGumroadPing(body));
    assert.equal(ping.userEmail, GMAIL);
    assert.equal(ping.accountEmail, GMAIL);
    assert.equal(ping.purchaserEmail, UNIVERSITY);
    assert.equal(ping.emailsDiffer, true);
  });

  it("keeps the dashboard remaining-credit calculation at 2 only for free users", () => {
    assert.equal(remainingDashboardCredits({ plan: "free", tailor_count: 1 }), 2);
    assert.equal(remainingDashboardCredits({ plan: "pro", tailor_count: 1 }), null);
  });
});

describe("Gumroad purchase SQL", () => {
  it("creates an atomic apply_pro_purchase function keyed by sale_id", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260904_atomic_gumroad_pro_grants.sql"),
      "utf8",
    );
    assert.match(sql, /create or replace function public.apply_pro_purchase/);
    assert.match(sql, /sale_id text primary key/);
    assert.match(sql, /for update/i);
    assert.match(sql, /alreadyProcessed/);
    assert.match(sql, /unmatched_purchases/);
  });

  it("repairs only the Gmail account for the 3 Sep 2026 purchase", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260904_repair_jephtha25_gmail_pro.sql"),
      "utf8",
    );
    assert.match(sql, /jephtha25@gmail.com/);
    assert.match(sql, /Does NOT modify 3810895@myuwc.ac.za/);
    assert.match(sql, /Historical repair: Gumroad Pro Monthly purchase for jephtha25@gmail.com/);
    assert.doesNotMatch(sql, /update public.users[\s\S]*3810895@myuwc.ac.za/);
  });
});
