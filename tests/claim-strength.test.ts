import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessRewrite } from "../src/lib/cv/claimStrength";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { fixtureSourceCv } from "./fixtures/source-cv";

describe("claim-strength validation", () => {
  it("rejects assisted → led", () => {
    const warning = assessRewrite("Assisted the store manager with stock counts", "Led the store manager with stock counts", "b1");
    assert.ok(warning);
    assert.equal(warning!.riskType, "ownership_inflation");
    assert.equal(warning!.severity, "high");
  });

  it("rejects supported → managed", () => {
    const warning = assessRewrite("Supported weekly stock counts", "Managed weekly stock counts", "b1");
    assert.ok(warning);
    assert.equal(warning!.riskType, "leadership_inflation");
  });

  it("rejects participated → owned", () => {
    const warning = assessRewrite("Participated in store openings", "Owned store openings", "b1");
    assert.ok(warning);
  });

  it("rejects contributed → architected", () => {
    const warning = assessRewrite("Contributed to the inventory spreadsheet", "Architected the inventory spreadsheet", "b1");
    assert.ok(warning);
  });

  it("rejects worked with → expert in", () => {
    const warning = assessRewrite("Worked with Excel for stock reports", "Expert in Excel for stock reports", "b1");
    assert.ok(warning);
    assert.equal(warning!.riskType, "proficiency_inflation");
  });

  it("rejects learned → implemented professionally", () => {
    const warning = assessRewrite("Learned the inventory checklist", "Implemented the inventory checklist", "b1");
    assert.ok(warning);
  });

  it("rejects team delivery → independent delivery", () => {
    const warning = assessRewrite("Collaborated with the team on store openings", "Independently delivered store openings", "b1");
    assert.ok(warning);
    assert.equal(warning!.riskType, "autonomy_inflation");
  });

  it("rejects prepared → directed strategy", () => {
    const warning = assessRewrite("Prepared weekly stock information", "Directed weekly stock strategy", "b1");
    assert.ok(warning);
  });

  it("rejects adding an unevidenced business result", () => {
    const warning = assessRewrite("Trained 15 new hires on the inventory checklist", "Trained 15 new hires which increased store revenue", "b1");
    assert.ok(warning);
    assert.equal(warning!.riskType, "causality_inflation");
  });

  it("allows neutral rephrasing", () => {
    const warning = assessRewrite(
      "Coordinated weekly stock counts across 6 stores and reduced shrinkage by 12%",
      "Coordinated weekly stock counts across 6 stores, reducing shrinkage by 12%",
      "b1",
    );
    assert.equal(warning, null);
  });

  it("restores the original bullet when merge sees high-severity inflation", () => {
    const source = fixtureSourceCv();
    source.experience[0].sourceBullets[1].text = "Assisted the manager with training 15 new hires";
    source.experience[0].bullets[1] = source.experience[0].sourceBullets[1].text;
    const { tailored, claimStrengthWarnings } = mergeProtectedFromSource(source, {
      summary: source.summary,
      experience: [
        {
          id: "experience-1",
          bullets: [
            {
              sourceBulletIds: ["experience-1-bullet-2"],
              tailoredText: "Led the manager with training 15 new hires",
              matchedKeywords: [],
            },
          ],
        },
      ],
    });
    assert.ok(claimStrengthWarnings.length >= 1);
    assert.ok(tailored.experience[0].bullets.some((b) => /Assisted/.test(b)));
    assert.ok(!tailored.experience[0].bullets.some((b) => /^Led /.test(b)));
  });
});
