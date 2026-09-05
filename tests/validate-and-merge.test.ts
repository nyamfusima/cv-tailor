import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv, cloneCanonical } from "../src/lib/cv/canonical";
import { mergeProtectedFromSource, restoreMissingFromSource, deltaFromFullCv } from "../src/lib/cv/mergeProtected";
import { validatePreservation } from "../src/lib/cv/validatePreservation";
import { fixtureSourceCv } from "./fixtures/source-cv";

describe("validatePreservation", () => {
  it("fails when a coursework item is omitted", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.education[0].coursework = tailored.education[0].coursework.slice(0, -1);
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.missingIds.some((id) => id.includes("coursework")));
  });

  it("fails when coursework text is shortened", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.education[0].coursework[0] = { ...tailored.education[0].coursework[0], text: "Business" };
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.changedProtectedFields.some((f) => f.includes("coursework")));
  });

  it("fails when an education entry is omitted", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.education = [tailored.education[0]];
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.missingIds.includes("education-2"));
  });

  it("fails when a date changes", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.experience[0].dates = "2020 – Present";
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.changedProtectedFields.includes("experience-1.dates"));
  });

  it("fails when a JD-only skill is invented", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.skills[0].skills.push({ id: "skill-group-1-item-99", name: "Kubernetes" });
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.unsupportedClaims.some((c) => c.includes("Kubernetes")));
  });

  it("allows a catalog skill name evidenced only by an alias in source bullets", () => {
    const source = canonicalizeCv({
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      experience: [{
        title: "Operations Coordinator",
        company: "BrightMart Retail",
        dates: "Jan 2022 – Present",
        bullets: ["Migrated store reports onto Azure blob storage"],
      }],
      education: [{ degree: "BCom", institution: "UWC", dates: "2021", coursework: [] }],
      skills: [{ category: "Operations", skills: ["Spreadsheets"] }],
    });
    const tailored = cloneCanonical(source);
    tailored.skills[0].skills.push({ id: "skill-group-1-item-99", name: "Microsoft Azure" });
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, true, report.unsupportedClaims.join(", ") || JSON.stringify(report));
    assert.equal(report.unsupportedClaims.length, 0);
  });

  it("fails when a numeric metric changes", () => {
    const source = fixtureSourceCv();
    const tailored = cloneCanonical(source);
    tailored.experience[0].bullets[0] = "Coordinated weekly stock counts across 20 stores and reduced shrinkage by 40%";
    tailored.experience[0].bulletEvidence = [
      {
        id: "experience-1-out-1",
        sourceBulletIds: ["experience-1-bullet-1"],
        originalText: source.experience[0].sourceBullets[0].text,
        tailoredText: tailored.experience[0].bullets[0],
        matchedKeywords: [],
      },
    ];
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, false);
    assert.ok(report.changedProtectedFields.some((f) => f.includes("metric") || f.startsWith("numeric:")));
  });

  it("passes when everything is preserved", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: "Retail operations coordinator experienced in stock control and store training.",
      experience: [
        {
          id: "experience-1",
          bullets: [
            {
              sourceBulletIds: ["experience-1-bullet-1"],
              tailoredText: "Coordinated weekly stock counts across 6 stores and reduced shrinkage by 12%",
              matchedKeywords: ["stock"],
            },
            {
              sourceBulletIds: ["experience-1-bullet-2"],
              tailoredText: "Trained 15 new hires on the inventory checklist",
              matchedKeywords: [],
            },
            {
              sourceBulletIds: ["experience-1-bullet-3"],
              tailoredText: "Built a shared spreadsheet that cut order errors from 18 to 5 per month",
              matchedKeywords: [],
            },
          ],
        },
      ],
      projects: [{ id: "project-1", description: "Built a tracker used by 3 regional managers during two new-store openings." }],
      skillOrder: [],
      keywordClassifications: [],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    const report = validatePreservation(source, tailored);
    assert.equal(report.valid, true);
    assert.equal(report.missingIds.length, 0);
  });
});

describe("mergeProtectedFromSource", () => {
  it("restores omitted coursework from the source", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [],
      projects: [],
      skillOrder: [],
      keywordClassifications: [],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    assert.equal(tailored.education[0].coursework.length, 5);
    assert.equal(tailored.education[0].coursework[3].text, "Financial Accounting");
    assert.equal(validatePreservation(source, tailored).valid, true);
  });

  it("restores shortened coursework verbatim", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [],
      projects: [],
      skillOrder: [],
      keywordClassifications: [],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    assert.equal(tailored.education[0].coursework[0].text, "Business Statistics");
  });

  it("keeps original bullet text when the model invents a metric", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [
        {
          id: "experience-1",
          bullets: [
            {
              sourceBulletIds: ["experience-1-bullet-1"],
              tailoredText: "Reduced shrinkage by 40% across 20 stores",
              matchedKeywords: [],
            },
          ],
        },
      ],
      projects: [],
      skillOrder: [],
      keywordClassifications: [],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    assert.ok(tailored.experience[0].bullets.some((b) => b.includes("12%")));
    assert.ok(!tailored.experience[0].bullets.some((b) => b.includes("40%")));
    assert.equal(tailored.experience[0].sourceBullets.length, 3);
    assert.equal(tailored.experience[0].bullets.length, 3);
  });

  it("copies contact, employers, titles, dates and both certifications", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, { summary: "New summary" });
    assert.equal(tailored.contact.name, "Alex Rivera");
    assert.equal(tailored.experience[0].company, "BrightMart Retail");
    assert.equal(tailored.experience[0].title, "Operations Coordinator");
    assert.equal(tailored.experience[0].dates, "Jan 2022 – Present");
    assert.equal(tailored.certifications.length, 2);
    assert.equal(tailored.education.length, 2);
    assert.equal(tailored.summary, "New summary");
  });

  it("restores unused source bullets instead of dropping them", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [
        {
          id: "experience-1",
          bullets: [
            {
              sourceBulletIds: ["experience-1-bullet-1"],
              tailoredText: "Coordinated weekly stock counts across 6 stores and reduced shrinkage by 12%",
              matchedKeywords: [],
            },
          ],
        },
      ],
      projects: [],
      skillOrder: [],
      keywordClassifications: [],
      missingKeywords: [],
      assumptions: [],
      conflicts: [],
    });
    assert.equal(tailored.experience[0].bullets.length, 3);
  });

  it("accepts fallback-model full-CV output and still preserves coursework", () => {
    const source = fixtureSourceCv();
    const fallbackShape = {
      name: "Wrong Name",
      education: [{ degree: "BCom", institution: "UWC", dates: "x", coursework: ["Business"] }],
      experience: [
        {
          id: "experience-1",
          title: "Changed",
          company: "Changed",
          dates: "changed",
          bullets: ["Coordinated weekly stock counts across 6 stores and reduced shrinkage by 12%"],
        },
      ],
      summary: "Fallback summary",
    };
    const { tailored } = mergeProtectedFromSource(source, deltaFromFullCv(fallbackShape));
    assert.equal(tailored.contact.name, "Alex Rivera");
    assert.equal(tailored.education[0].coursework.length, 5);
    assert.equal(tailored.experience[0].title, "Operations Coordinator");
  });
});

describe("restoreMissingFromSource", () => {
  it("repairs a tailored CV that lost an education entry", () => {
    const source = fixtureSourceCv();
    const broken = cloneCanonical(source);
    broken.education = [];
    const restored = restoreMissingFromSource(source, broken);
    assert.equal(restored.education.length, 2);
    assert.equal(validatePreservation(source, restored).valid, true);
  });
});
