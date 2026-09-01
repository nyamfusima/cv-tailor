import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv } from "../src/lib/cv/canonical";
import { createMemoryCreditStore } from "../src/lib/cv/credits";
import { executeTailorRequest } from "../src/lib/cv/tailorRequest";
import { IncompleteModelOutputError, type CompleteJsonFn, type CompleteJsonResponse } from "../src/lib/cv/types";
import { fixtureSourceCv, RAW_CV_WITH_COURSEWORK } from "./fixtures/source-cv";
import type { UserCredits } from "../src/lib/types";
import { renderResumePdfBytes } from "../src/lib/generatePDF";
import { flattenExtractedText } from "../src/lib/parseFile";
import { extractText } from "unpdf";

function ok(parsed: unknown, model = "gpt-5.1"): CompleteJsonResponse {
  return {
    parsed,
    raw: JSON.stringify(parsed),
    model,
    finishReason: "stop",
    promptTokens: 8,
    completionTokens: 8,
    latencyMs: 4,
    retryCount: 0,
    promptVersion: "test",
  };
}

function extracted(source = fixtureSourceCv()) {
  return {
    name: source.contact.name,
    email: source.contact.email,
    phone: source.contact.phone,
    location: source.contact.location,
    linkedin: source.contact.linkedin,
    summary: source.summary,
    experience: source.experience.map((j) => ({
      title: j.title,
      company: j.company,
      dates: j.dates,
      bullets: j.sourceBullets.map((b) => b.text),
    })),
    education: source.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      dates: e.dates,
      coursework: e.coursework.map((c) => c.text),
    })),
    certifications: source.certifications,
    projects: source.projects,
    skills: source.skills.map((g) => ({ category: g.category, skills: g.skills.map((s) => s.name) })),
    customSections: source.customSections,
  };
}

const user = { id: "user-1", email: "alex@example.com" };
const credits = (): UserCredits => ({
  id: "user-1",
  email: "alex@example.com",
  plan: "free",
  tailor_count: 0,
  tailor_reset_date: "2026-10-01T00:00:00Z",
});

function emptyDelta() {
  return {
    summary: "Retail operations coordinator.",
    experience: [],
    projects: [],
    skillOrder: [],
    keywordClassifications: [],
    missingKeywords: [],
    assumptions: [],
    conflicts: [],
  };
}

async function run(opts: {
  completeJson: CompleteJsonFn;
  requestId?: string;
  persistError?: string;
  reviewedSource?: unknown;
  cvText?: string;
  store?: ReturnType<typeof createMemoryCreditStore>;
}) {
  const store = opts.store ?? createMemoryCreditStore(new Map([["user-1", credits()]]));
  return executeTailorRequest({
    user,
    isAdmin: false,
    jobDescription: "Retail operations lead. Stock counts, training, Excel.",
    requestId: opts.requestId ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    reviewedSource: opts.reviewedSource,
    cvText: opts.cvText ?? RAW_CV_WITH_COURSEWORK,
    extractionConfirmed: true,
    completeJson: opts.completeJson,
    creditStore: store,
    persist: async () => (opts.persistError ? { error: { message: opts.persistError } } : { error: null }),
    loadCredits: async () => store.users.get("user-1") ?? credits(),
  });
}

describe("executeTailorRequest", () => {
  it("returns a valid tailored CV and consumes one credit", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    const result = await run({
      store,
      completeJson: async (req) => ok(req.purpose === "extract" ? extracted() : emptyDelta()),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.name, "Alex Rivera");
    assert.equal((result.body.education as { coursework: string[] }[])[0].coursework.length, 5);
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
  });

  it("restores omitted coursework from a reviewed source", async () => {
    const source = extracted();
    const result = await run({
      reviewedSource: source,
      completeJson: async () => ok(emptyDelta()),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(
      (result.body.education as { coursework: string[] }[])[0].coursework,
      fixtureSourceCv().education[0].coursework.map((c) => c.text),
    );
  });

  it("does not insert an invented skill", async () => {
    const result = await run({
      reviewedSource: extracted(),
      completeJson: async () => ok({
        ...emptyDelta(),
        skillOrder: [{ categoryId: "skill-group-1", skillIds: ["skill-group-1-item-99"] }],
      }),
    });
    const skills = (result.body.skills as { skills: string[] }[]).flatMap((g) => g.skills);
    assert.ok(!skills.includes("Kubernetes"));
  });

  it("rejects responsibility inflation by restoring the source bullet", async () => {
    const source = fixtureSourceCv();
    source.experience[0].sourceBullets[1].text = "Assisted the manager with training 15 new hires";
    const result = await run({
      reviewedSource: extracted(source),
      completeJson: async () => ok({
        ...emptyDelta(),
        experience: [{
          id: "experience-1",
          bullets: [{
            sourceBulletIds: ["experience-1-bullet-2"],
            tailoredText: "Led the manager with training 15 new hires",
            matchedKeywords: [],
          }],
        }],
      }),
    });
    const bullets = (result.body.experience as { bullets: string[] }[])[0].bullets.join(" ");
    assert.match(bullets, /Assisted/);
    assert.doesNotMatch(bullets, /Led the manager/);
  });

  it("blocks incomplete extraction", async () => {
    const result = await run({
      completeJson: async () => {
        throw new IncompleteModelOutputError("truncated", "length", "gpt-5.1");
      },
    });
    assert.equal(result.status, 502);
  });

  it("preserves custom sections", async () => {
    const source = canonicalizeCv({
      ...extracted(),
      customSections: [{ title: "Languages", items: [{ text: "English — fluent" }] }],
    });
    const result = await run({
      reviewedSource: source,
      completeJson: async () => ok(emptyDelta()),
    });
    const sections = result.body.customSections as { title: string; items: { text: string }[] }[];
    assert.equal(sections[0].title, "Languages");
    assert.equal(sections[0].items[0].text, "English — fluent");
  });

  it("accepts fallback-model success", async () => {
    const result = await run({
      reviewedSource: extracted(),
      completeJson: async () => ok(emptyDelta(), "gpt-5-mini"),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.modelUsed, "gpt-5-mini");
  });

  it("refunds the reservation when both models fail", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    const result = await run({
      store,
      reviewedSource: extracted(),
      completeJson: async () => {
        throw new Error("AI service unavailable after retries.");
      },
    });
    assert.equal(result.status, 500);
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
  });

  it("refunds the reservation when persistence fails", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    const result = await run({
      store,
      persistError: "insert failed",
      reviewedSource: extracted(),
      completeJson: async () => ok(emptyDelta()),
    });
    assert.equal(result.status, 500);
    assert.equal(result.body.error, "DB_INSERT_FAILED");
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
  });

  it("denies expired Pro before reserving a credit", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", {
      ...credits(),
      plan: "expired",
    }]]));
    const result = await run({
      store,
      reviewedSource: extracted(),
      completeJson: async () => ok(emptyDelta()),
    });
    assert.equal(result.status, 403);
    assert.equal(result.body.error, "NO_CREDITS");
    assert.equal(store.users.get("user-1")?.tailor_count, 0);
  });

  it("lets an admin tailor without consuming credits", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", {
      ...credits(),
      plan: "expired",
      tailor_count: 3,
    }]]));
    const result = await executeTailorRequest({
      user,
      isAdmin: true,
      jobDescription: "Retail operations lead. Stock counts, training, Excel.",
      requestId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      reviewedSource: extracted(),
      cvText: RAW_CV_WITH_COURSEWORK,
      extractionConfirmed: true,
      completeJson: async () => ok(emptyDelta()),
      creditStore: store,
      persist: async () => ({ error: null }),
      loadCredits: async () => store.users.get("user-1") ?? credits(),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.name, "Alex Rivera");
    assert.equal(store.users.get("user-1")?.tailor_count, 3);
  });

  it("does not charge twice for a repeated request ID after consume", async () => {
    const store = createMemoryCreditStore(new Map([["user-1", credits()]]));
    const first = await run({
      store,
      requestId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      reviewedSource: extracted(),
      completeJson: async () => ok(emptyDelta()),
    });
    const second = await run({
      store,
      requestId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      reviewedSource: extracted(),
      completeJson: async () => ok(emptyDelta()),
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.equal(store.users.get("user-1")?.tailor_count, 1);
  });

  it("does not return success when consume fails after persist", async () => {
    const inner = createMemoryCreditStore(new Map([["user-1", credits()]]));
    const store = {
      users: inner.users,
      reserve: inner.reserve.bind(inner),
      refund: inner.refund.bind(inner),
      consume: async () => ({ ok: false as const, error: "db_down" }),
    };
    const result = await executeTailorRequest({
      user,
      isAdmin: false,
      jobDescription: "Retail operations lead. Stock counts, training, Excel.",
      requestId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      reviewedSource: extracted(),
      cvText: RAW_CV_WITH_COURSEWORK,
      extractionConfirmed: true,
      completeJson: async () => ok(emptyDelta()),
      creditStore: store,
      persist: async () => ({ error: null }),
      loadCredits: async () => store.users.get("user-1") ?? credits(),
    });
    assert.equal(result.status, 500);
    assert.equal(result.body.error, "CREDIT_CONSUME_FAILED");
    const retry = await inner.reserve(
      "user-1",
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
      store.users.get("user-1") ?? credits(),
    );
    assert.equal(retry.status, "reserved");
    assert.notEqual(retry.status, "consumed");
  });

  it("save/load and PDF text retain coursework and custom sections", async () => {
    const source = canonicalizeCv({
      ...extracted(),
      customSections: [{ title: "Languages", items: [{ text: "English — fluent" }] }],
    });
    const result = await run({
      reviewedSource: source,
      completeJson: async () => ok(emptyDelta()),
    });
    const reloaded = JSON.parse(JSON.stringify(result.body));
    assert.equal(reloaded.education[0].coursework.length, 5);
    const bytes = await renderResumePdfBytes(reloaded);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    assert.match(blob, /Retail Oper-?\s*ations/);
    assert.match(blob, /English/);
  });
});
