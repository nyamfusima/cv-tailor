# CV production-hardening audit

**Date:** 2026-08-31  
**Scope:** Remaining risks after preservation-v2. This report cites the code as it existed before this hardening pass.

---

## Confirmed working

| Claim | Evidence |
| --- | --- |
| Tailor route uses `runTailorPipeline`, not the old full-CV prompt | `src/app/api/tailor/route.ts` 6–14, 56–60 |
| Extract + tailor + merge + validate + restore + one repair | `src/lib/cv/pipeline.ts` 44–102 |
| Deterministic alignment score | `src/lib/cv/pipeline.ts` 124–130; `src/lib/cv/matchScore.ts` |
| Credit deducted only after successful persist | `src/app/api/tailor/route.ts` 76–95 |
| Failed preservation / incomplete JSON does not deduct | catch at `route.ts` 98–110; deduct only on success path |
| Coursework UI + PDF still render when present | `src/app/results/page.tsx` 189–194; `src/lib/generatePDF.tsx` 77–91 |
| Tailor extract token cap is 16384, not 2048 | `src/lib/cv/pipeline.ts` 48 |
| `finish_reason === "length"` is rejected | `src/lib/cv/openai.ts` 95–100 |
| Primary `gpt-5.1` + fallback `gpt-5-mini` | `src/lib/cv/types.ts` 3–4; `openai.ts` 51–52, 67 |
| Structured `json_schema` then `json_object` | `src/lib/cv/openai.ts` 69–81 |
| No leftover “expert technical CV rewriter” system prompt on `/api/tailor` | grep of `src/app/api/tailor/route.ts` — not present |

## Confirmed defects

| Defect | Severity | Evidence |
| --- | --- | --- |
| Preservation starts **after** extraction. Heading/coursework loss in raw text is not reported or blocked. | High | `pipeline.ts` 52: `canonicalizeCv` then tailor. No extraction report. |
| Image-only / empty PDF is not detected. `parseFile` returns whatever `unpdf` extracted. | High | `src/lib/parseFile.ts` 7–10 |
| Languages, volunteer, awards, publications, other sections are dropped. | High | `CanonicalCV` (`src/lib/cv/types.ts` 82–90) has no `customSections`. Extract schema (`schema.ts` 10–22) has no slot for them. |
| Claim strengthening (assisted→led) is not detected. Only IDs, protected strings, numbers, extra skills. | High | `src/lib/cv/validatePreservation.ts` 64–207 |
| Credit deduct is read-then-write, not atomic. Concurrent requests can both pass `hasTailorCredits` then both increment. | Critical | `src/lib/user.ts` 90–108; `hasTailorCredits` 111–117; route 34–41 then 93–95 |
| No reservation, no refund, no request-id idempotency. Persist-then-deduct means a persist success + deduct failure under-charges; two parallel posts over-charge. | Critical | `route.ts` 76–95; no ledger table in `supabase/migrations/` |
| PDF tests do not generate a PDF or extract its text. | Medium | `tests/pdf-coursework.test.ts` checks `courseworkDisplay` + source string |
| No route/integration tests of `POST /api/tailor` | Medium | `tests/` has unit tests only |
| `/api/parse-cv` is still a separate unconstrained extract (job-match). No IDs, no completeness, no `finish_reason`. | Medium | `src/app/api/parse-cv/route.ts` 38–87. Token cap is now 8192 (line 40), so the old 2048 risk is **removed on this route**, but the path is still unprotected. |
| No source-review step. Upload → loading → tailor. | High | `UploadForm.tsx` 164–170; `loading-screen/page.tsx` 48 |
| Telemetry omits extraction warnings, credit status, claim-strength, custom-section count, primary/fallback flag | Low | `openai.ts` 33–47 |

## Likely risks

- `parse-cv` can still accept truncated-but-parseable JSON (`route.ts` 75–87).
- Repair incomplete output is swallowed and restore is retried (`pipeline.ts` 91–97); if restore cannot make `valid`, the request fails — good — but there is no dedicated test.
- Overload on primary then fallback is implemented (`openai.ts` 121–126) but untested against a mock client.
- PDF is a single Harvard-style selectable-text template (`generatePDF.tsx`, Times fonts in `theme.ts` 11–14). Likely ATS-readable; not verified against any ATS vendor.
- Admin users skip credits entirely (`tailor/route.ts` 32, 93).

## Unverified behaviour

- Live OpenAI extract completeness on real user CVs.
- Concurrent credit races in production Postgres (no RPC exists yet).
- Actual PDF text extraction from `@react-pdf/renderer` output (not previously tested).
- Whether `unpdf` returns empty string vs whitespace for scanned PDFs.

---

## OpenAI call inventory (`/api/tailor` via `createOpenAICompleteJson`)

| Purpose | Model | Fallback | `max_completion_tokens` | `response_format` | Incomplete |
| --- | --- | --- | --- | --- | --- |
| extract | `gpt-5.1` (env override) | `gpt-5-mini` | 16384 | json_schema → json_object | throw on `length` |
| tailor | same | same | 8192 | same | same |
| repair | same | same | 4096 | same | caught, restore |

Retries: 3 attempts per format per model on 429/500/503 (`openai.ts` 84–128).

`/api/parse-cv` still uses a single `gpt-5.1` call, 8192 tokens, no structured output, no fallback.

---

## Credit flow (before hardening)

```
hasTailorCredits (read)
  → extract + tailor + validate
  → insert tailor_sessions
  → deductTailorCredit (read user, compute next, update)
```

No unique request ID. No ledger. `computeNextTailorUsage` is deterministic for one snapshot but two snapshots of `tailor_count: 2` both become `3`.

Existing migrations (`supabase/migrations/20260801_*.sql`) cover purchases and plan expiry only. No credit ledger.

---

## Recommended hardening order

1. Extraction report + parse-file emptiness check.  
2. Custom sections through extract → merge → UI → PDF.  
3. Source-review step before tailor.  
4. Claim-strength rules in merge.  
5. Postgres reserve/consume/refund RPCs + request ID.  
6. Real PDF text round-trip + route tests.  
7. Telemetry fields (no PII).

---

## PDF / ATS readability (post-hardening)

The product has one resume template (`ResumeDocument`, profile `resume`) and one letter profile. Density tiers change spacing only, not fonts or copy.

The generated PDF uses Times-Roman / Times-Bold / Times-Italic, a single column, and selectable text (verified by extracting text from a generated buffer with `unpdf`). That is generally ATS-readable. **Do not claim all ATS systems behave identically.** Hyphenation can split a word across a line (`Retail Oper- ations`); the tokens remain in the extracted text.

---

## Deployment order (required)

1. Apply `supabase/migrations/20260831_tailor_credit_reservations.sql` to production **before** deploying app code that calls `reserve_tailor_credit` / `consume_tailor_credit` / `refund_tailor_credit`.
2. Confirm `service_role` can execute those RPCs. The app uses the service-role admin client.
3. Deploy the application. If the RPCs are missing, reservations fail closed (`ok: false`) and the user is not charged via the old `deductTailorCredit` path — `/api/tailor` no longer calls it.
4. Old tailored sessions without `customSections` still render as empty extra sections.

Do not claim production credit atomicity until this migration is applied. TypeScript reservation helpers are not a substitute for the Postgres `FOR UPDATE` + unique `request_id` constraint.
