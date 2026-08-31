# CV tailoring preservation audit

**Date:** 2026-08-31  
**Scope:** File upload → parse → extract → tailor → persist → UI → PDF  
**Confirmed user defect:** Education coursework removed or shortened after tailoring.

This report is based on a full-repository trace. The system prompt is **not** the only failure point.

---

## Executive finding

Coursework (and other protected facts) can disappear because the tailoring model is asked to **re-emit the entire CV as JSON**, while the application:

1. never assigns stable item IDs;
2. never merges protected fields from the extracted source;
3. never validates source-vs-tailored completeness;
4. treats `coursework` as optional;
5. deducts a credit as soon as JSON parses, even if the CV is incomplete.

Prompt instructions already say “preserve ALL coursework”, but they are contradicted by brevity rules, a 90–95% preservation target, and an output example that shows only two coursework items. **Prompt-only fixes cannot enforce the contract.**

---

## End-to-end pipeline

```
UploadForm (PDF/DOCX + job description)
  → sessionStorage.pendingTailor
  → /loading-screen
  → POST /api/tailor
       1. parseFile()          PDF/DOCX → raw text
       2. callAI(extract)      raw text → original JSON   (gpt-5.1, 16384 tokens)
       3. JSON.parse           no schema, no IDs
       4. callAI(tailor)       original JSON + JD → tailored JSON
       5. JSON.parse           no semantic validation
       6. deductTailorCredit   charged on parse success
       7. attach originalCV + meta
       8. Supabase tailor_sessions.insert
       9. return JSON
  → sessionStorage.tailoredCV
  → /results preview + editor
  → downloadPDF() → ResumeDocument
```

Parallel paths (not the tailor pipeline, but they share types):

- `POST /api/parse-cv` — job-match extraction (`max_completion_tokens: 2048`, example `"coursework": []`)
- `POST /api/extract-cv-text` — raw text only
- Dashboard / admin reload stored `tailored_cv` JSON

---

## Relevant files and functions

| Stage | File | Functions |
| --- | --- | --- |
| Upload | `src/components/UploadForm.tsx` | `handleSubmit` |
| Client call | `src/app/loading-screen/page.tsx` | `run` |
| Parse | `src/lib/parseFile.ts` | `parseFile` |
| Tailor API | `src/app/api/tailor/route.ts` | `POST`, `callAI`, `extractJSON`, `derivePrimaryRole` |
| Job-match extract | `src/app/api/parse-cv/route.ts` | `POST` |
| Types | `src/lib/types.ts` | `Education`, `OriginalCV`, `TailoredCV` |
| Credits | `src/lib/user.ts` | `deductTailorCredit`, `hasTailorCredits` |
| Persist | `src/app/api/tailor/route.ts` | Supabase `tailor_sessions.insert` |
| Preview / edit | `src/app/results/page.tsx` | `CVSections`, `TailoredCVCard` |
| PDF | `src/lib/generatePDF.tsx` | `ResumeDocument`, `downloadPDF` |
| PDF fit | `src/lib/pdf/fit.ts` | `renderFittedDocument` (spacing only; does not drop fields) |
| Admin preview | `src/app/admin/page.tsx` | tailored tab (no education / coursework) |

There is **no** existing test suite, Zod schema, structured-output contract, fallback model on `/api/tailor`, or preservation validator.

---

## Where loss occurs

| Stage | Verdict | Severity | Notes |
| --- | --- | --- | --- |
| A. File parsing | Potential | Medium | `unpdf` / mammoth can miss layout-only lists. Not the confirmed coursework bug: later stages drop items that *were* extracted. |
| B. Source extraction | Likely | High | Extraction is unconstrained JSON. No check that coursework in raw text survived. `parse-cv` example is `"coursework": []` and only 2048 output tokens. |
| C. Tailoring | **Confirmed** | Critical | Model re-emits the full CV. Prompt conflicts invite deletion and invention. Coursework example shows two items. |
| D. Schema / parse | **Confirmed** | Critical | `coursework?` optional. No IDs. `JSON.parse` only. Empty array accepted as success. |
| E. Storage | **Confirmed** | High | Persists whatever the model returned. No merge from `original`. |
| F. UI rendering | Confirmed (silent) | Medium | Hides coursework when the array is missing/empty. Does not cause loss; conceals it. |
| G. PDF rendering | Confirmed (silent) | Medium | Same condition as UI. Fit pass does not strip fields. Admin preview omits education entirely. |
| H. Output truncation | Likely | High | No `finish_reason` check. Education is last in the schema. A valid-looking JSON that simply omitted later sections would parse. |
| I. Fallback model | Potential | Medium | `/api/tailor` has no fallback. Interview routes fall back to `gpt-5-mini` with no preservation contract. |
| J. Multiple stages | **Confirmed** | Critical | C + D + E are sufficient to lose coursework even when A/B/H succeed. |

**Primary root cause:** tailoring is a full-document rewrite with no deterministic copy of protected fields and no source-vs-output validator.

**Secondary root cause:** prompt conflicts (see below) make omission the path of least resistance when the model is under a word-count or token budget.

---

## Evidence

### Confirmed — tailoring may omit or shorten items

`src/app/api/tailor/route.ts`

- Lines 167–168: “at least 90% factually identical” — explicitly allows ~10% deletion.
- Lines 192–193: “Preserve all major projects … unless they are completely irrelevant” — allows dropping items.
- Lines 197–198: JD-adjacent technologies may be inserted with “familiar with” / “exposure to”.
- Lines 201–202: skills may be “directly inferred”.
- Lines 220–221: “Maximum 20 words per bullet — cut ruthlessly”.
- Lines 237–240: preservation check is an *internal* model self-check, not application code.
- Lines 240: “preserve at least 95% of the original information” — conflicts with the “never remove coursework” line at 211–212.
- Lines 272–277: output example lists two coursework strings (`"Relevant Course 1", "Relevant Course 2"`), which teaches truncation.
- Lines 315–333: extract then tailor, both via `JSON.parse(extractJSON(...))` with no schema and no ID stamp.
- Lines 335–337: credit deducted after parse, before quality or DB success.

`src/lib/types.ts`

- Line 12: `coursework?: string[]` — missing/undefined is type-legal.

`src/app/results/page.tsx` lines 189–194 and `src/lib/generatePDF.tsx` lines 84–88: coursework renders only when `length > 0`.

### Likely — extraction and truncation

`src/app/api/parse-cv/route.ts` lines 40, 62: 2048 output tokens; example coursework is `[]`.

`src/app/api/tailor/route.ts` `callAI` (lines 21–43):

- No `finish_reason` / `incomplete` handling.
- Truncated JSON: `extractJSON` returns the raw string and `JSON.parse` throws (hard fail). A *complete* JSON object that simply left out later keys succeeds.
- Education / certifications / projects sit after experience in the requested shape — the first sections to be dropped under an output budget.

`callAI` retries 429/500/503 only. There is no fallback model on this route (unlike `src/app/api/interview/generate-plan/route.ts` and `debrief`).

### Potential — file parse

`src/lib/parseFile.ts`: PDF via `unpdf` `{ mergePages: true }`; DOCX via `mammoth.extractRawText`. Multi-column or table coursework can be lost before any model runs. No fixture coverage.

### Credit / failure behaviour

- Deduct happens after JSON parse and **before** the Supabase insert (route lines 335–377). A DB failure returns 500 after the user has been charged.
- `deductTailorCredit` is read-then-write (not atomic). Concurrent requests can double-count.
- Failed parse / thrown errors do **not** deduct (good). Incomplete-but-parseable CVs **do** deduct (bad).

Webhooks (`src/app/api/webhook/route.ts`, `src/app/api/webhooks/gumroad/route.ts`) set `plan: "pro"` and do not increment tailor credits. Duplicate upgrade webhooks are largely idempotent for credits; they were not changed in this work.

### Match score

`matchScore` and `scoreBreakdown` are invented by the generation model (`route.ts` lines 302–310). No deterministic check. UI labels this “ATS Match Score” (`src/app/results/page.tsx` lines 1016, 1101), which over-claims.

### Prompt conflicts (summary)

| Instruction | Conflicts with |
| --- | --- |
| Preserve all coursework exactly | 90% / 95% targets; two-item example; “cut ruthlessly” |
| Never invent | “familiar with” / inferred skills / JD vocabulary rewrite |
| Preserve exact titles and companies | “rephrasing existing experience using the job description's exact vocabulary” |
| Do not reorder experience | “Reordering existing content so the most job-relevant items appear first” (skills/content) vs dates rule “do not reorder” entries |
| Technical-specificity rules | Written for engineering CVs; unsafe for non-technical roles |

The job description is not treated as untrusted data (no injection fence beyond XML tags).

### Schema weaknesses

- No item IDs.
- `coursework`, `certifications`, `projects`, `references` optional.
- No evidence / provenance on rewritten bullets.
- `assumptions` is a free-text invitation to add claims.
- No `missingKeywords` field — unsupported JD terms are either inserted or lost.
- Types and runtime JSON are not validated against each other.
- No languages / volunteer / awards / publications in the product schema (do not add without UI + PDF + persist).

### Token-limit risks

| Call | Limit | Risk |
| --- | --- | --- |
| Tailor extract | 16384 | Low–medium for typical CVs; high for very long CVs because the model re-emits everything |
| Tailor rewrite | 16384 | High: full CV + scores + assumptions. Later keys (education, coursework, certs) drop first |
| parse-cv | 2048 | High for any CV with long experience + education |
| Cover letter | 2048 | Out of scope |

No input/output token logging. No incomplete-response path.

### Fallback-model differences

`/api/tailor` uses only `gpt-5.1`. Interview/job routes already fall back to `gpt-5-mini`. A future overload fallback without the same merge/validator would regress preservation. Treat fallback as untrusted and run the same contract.

### Rendering discrepancies

| Schema field | Results UI | Editor | PDF | Admin |
| --- | --- | --- | --- | --- |
| name / contact | yes | yes | yes | yes (no LinkedIn) |
| summary | yes | yes | yes | yes |
| skills | yes | yes | yes | yes |
| experience | yes | yes | yes | yes |
| education | yes | yes | yes | **no** |
| coursework | yes if non-empty | yes | yes if non-empty | **no** |
| certifications | yes | yes | yes | **no** |
| projects | yes | yes | yes | **no** |
| references | editor only | yes | yes | no |
| IDs / evidence | n/a | n/a | n/a | n/a |

PDF fit (`src/lib/pdf/fit.ts`) only tightens density; it does not omit sections.

Authoritative coverage table (kept in sync in `src/lib/cv/coverage.ts`):

| Schema field | UI component | PDF component | Test |
| --- | --- | --- | --- |
| name / contact | results/TailoredCVCard header | ResumeDocument/DocumentHeader | tests/pdf-coursework.test.ts |
| summary | results/TailoredCVCard + CVSections | ResumeDocument/Section Summary | tests/pdf-coursework.test.ts |
| skills | results/TailoredCVCard + CVSections | ResumeDocument/Key Skills | tests/pdf-coursework.test.ts |
| experience | results/TailoredCVCard + CVSections | ResumeDocument/Experience | tests/pdf-coursework.test.ts |
| education | results/TailoredCVCard + CVSections | ResumeDocument/Education | tests/pdf-coursework.test.ts |
| education.coursework | results/TailoredCVCard + CVSections | ResumeDocument/Note coursework | tests/pdf-coursework.test.ts |
| certifications | results/TailoredCVCard + CVSections | ResumeDocument/Professional Development | tests/pdf-coursework.test.ts |
| projects | results/TailoredCVCard + CVSections | ResumeDocument/Projects | tests/pdf-coursework.test.ts |
| references | results/TailoredCVCard editor | ResumeDocument/References | tests/pdf-coursework.test.ts |

### Test coverage gaps

Zero `*.test.ts` / `*.spec.ts` files. No fixtures. No evaluation of recall, no PDF field assertion, no credit-on-failure test.

---

## Recommended fix order

1. Canonicalize the extracted CV in application code and stamp stable IDs.
2. Stop asking the model to re-emit protected fields; merge them from the source after the response.
3. Validate source vs tailored (IDs, coursework verbatim, dates, names, numbers).
4. Deterministic restore of any missing protected item; targeted repair only if that is not enough.
5. Rewrite the tailoring prompt as an evidence-constrained editor; extract it from the route.
6. Compute match score in code; treat JD keywords as untrusted.
7. Handle incomplete / fallback / token metadata; charge only after a valid persist.
8. Keep UI/PDF rendering of coursework; add a PDF regression test.
9. Add fixtures and the evaluation suite.

---

## Classification recap

- **Confirmed defects:** full-CV rewrite without merge; optional coursework; prompt conflicts that allow deletion and invention; credit on incomplete success; model-assigned match score; UI/PDF/admin silence when coursework is empty.
- **Likely defects:** extraction omission; output-budget truncation of later sections; `parse-cv` empty-coursework example.
- **Potential risks:** PDF/DOCX layout loss; future fallback model; non-atomic credit increment; prompt injection via the job description.
