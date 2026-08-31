import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { fixtureSourceCv, technicalSourceCv } from "./fixtures/source-cv";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";

describe("scoreJobAlignment", () => {
  it("is calculated in code and does not use a model-provided score", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [],
      projects: [],
      skillOrder: [],
      keywordClassifications: [{ keyword: "stock", status: "evidenced_and_used" }],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    const score = scoreJobAlignment(source, tailored, "Retail operations lead for stock counts and training.");
    assert.ok(score.matchScore >= 0 && score.matchScore <= 100);
    assert.match(score.explanation, /not an ATS-pass guarantee/i);
    assert.ok(score.scoreBreakdown.keywordsMatch >= 0);
  });

  it("penalises unsupported claims", () => {
    const source = technicalSourceCv();
    const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
    const clean = scoreJobAlignment(source, tailored, "Go PostgreSQL REST APIs");
    const penalised = scoreJobAlignment(source, tailored, "Go PostgreSQL REST APIs", [], 3);
    assert.ok(penalised.matchScore <= clean.matchScore);
  });
});
