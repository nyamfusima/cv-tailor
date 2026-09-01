import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { promoteEvidencedJobSkills } from "../src/lib/cv/skillPromotion";
import { fixtureSourceCv, officeAdminSourceCv, TECH_JD, technicalSourceCv } from "./fixtures/source-cv";
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

  it("scores a technical CV against a matching JD in a usable ATS range", () => {
    const source = technicalSourceCv();
    const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
    const promoted = promoteEvidencedJobSkills(source, tailored, TECH_JD);
    const score = scoreJobAlignment(source, promoted, TECH_JD);
    assert.ok(score.matchScore >= 72, `expected >= 72, got ${score.matchScore}`);
    assert.ok(score.scoreBreakdown.skillsAlignment >= 70);
    assert.ok(score.missingKeywords.some((keyword) => /kubernetes/i.test(keyword)));
    assert.ok(score.missingKeywords.some((keyword) => /terraform/i.test(keyword)));
  });

  it("keeps a weak cross-domain match below a strong technical match", () => {
    const tech = technicalSourceCv();
    const admin = officeAdminSourceCv();
    const { tailored: techTailored } = mergeProtectedFromSource(tech, { summary: tech.summary });
    const { tailored: adminTailored } = mergeProtectedFromSource(admin, { summary: admin.summary });
    const strong = scoreJobAlignment(tech, techTailored, TECH_JD);
    const weak = scoreJobAlignment(admin, adminTailored, TECH_JD);
    assert.ok(strong.matchScore > weak.matchScore);
    assert.ok(weak.matchScore < 55);
  });

  it("does not drop source skills when the model skillOrder lists one id per group", () => {
    const source = canonicalizeCv({
      name: "Alex Candidate",
      skills: [
        { category: "Programming Languages", skills: ["Python", "Java", "TypeScript", "JavaScript"] },
        { category: "Developer Tools", skills: ["Git", "Docker", "VS Code", "Cursor"] },
      ],
    });
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      skillOrder: [
        { categoryId: "skill-group-1", skillIds: ["skill-group-1-item-1"] },
        { categoryId: "skill-group-2", skillIds: ["skill-group-2-item-1"] },
      ],
    });
    const languages = tailored.skills.find((group) => group.category === "Programming Languages")?.skills.map((skill) => skill.name);
    const tools = tailored.skills.find((group) => group.category === "Developer Tools")?.skills.map((skill) => skill.name);
    assert.deepEqual(languages, ["Python", "Java", "TypeScript", "JavaScript"]);
    assert.deepEqual(tools, ["Git", "Docker", "VS Code", "Cursor"]);
  });
});
