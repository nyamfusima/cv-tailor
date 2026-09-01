import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { promoteEvidencedJobSkills } from "../src/lib/cv/skillPromotion";
import { fixtureSourceCv, technicalSourceCv } from "./fixtures/source-cv";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { canonicalizeCv } from "../src/lib/cv/canonical";

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

  it("raises skill alignment when evidenced JD tools are promoted into KEY SKILLS", () => {
    const source = canonicalizeCv({
      name: "Alex Candidate",
      experience: [{ title: "Intern", company: "Labs", dates: "2026", bullets: ["Deployed a FastAPI service with Docker"] }],
      projects: [{ name: "API", description: "Internal API", technologies: ["Docker", "FastAPI"] }],
      skills: [{ category: "Programming Languages", skills: ["Python"] }],
    });
    const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
    const jd = "Backend intern using Python, Docker, FastAPI and Kubernetes";
    const before = scoreJobAlignment(source, tailored, jd);
    const promoted = promoteEvidencedJobSkills(source, tailored, jd);
    const after = scoreJobAlignment(source, promoted, jd);
    const names = promoted.skills.flatMap((group) => group.skills.map((skill) => skill.name));
    assert.ok(names.includes("Docker"));
    assert.ok(names.includes("FastAPI"));
    assert.ok(!names.includes("Kubernetes"));
    assert.ok(after.scoreBreakdown.skillsAlignment >= before.scoreBreakdown.skillsAlignment);
    assert.ok(after.matchScore >= before.matchScore);
  });
});
