import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv } from "../src/lib/cv/canonical";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { validatePreservation } from "../src/lib/cv/validatePreservation";
import { toOriginalWire, toTailoredWire } from "../src/lib/cv/wire";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";

function sourceWithCustom() {
  return canonicalizeCv({
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    experience: [{ title: "Ops", company: "BrightMart", dates: "2022", bullets: ["Did stock counts"] }],
    education: [{ degree: "BCom", institution: "UWC", dates: "2021", coursework: ["Retail Operations"] }],
    skills: [{ category: "Ops", skills: ["Excel"] }],
    customSections: [
      { title: "Languages", items: [{ text: "English — fluent" }, { text: "isiXhosa — conversational" }] },
      { title: "Volunteer Experience", items: [{ text: "Weekend stock help at a community shop" }] },
      { title: "Awards", items: [{ text: "Store service award 2023" }] },
      { title: "Education", items: [{ text: "should not duplicate" }] },
    ],
  });
}

describe("custom sections", () => {
  it("keeps Languages, Volunteer Experience and Awards and drops dedicated duplicates", () => {
    const source = sourceWithCustom();
    assert.equal(source.customSections.length, 3);
    assert.ok(source.customSections.every((s) => s.title !== "Education"));
    assert.equal(source.customSections[0].id, "custom-1");
    assert.equal(source.customSections[0].items[0].text, "English — fluent");
  });

  it("preserves custom sections through merge, validation and save/load", () => {
    const source = sourceWithCustom();
    const { tailored } = mergeProtectedFromSource(source, { summary: "Ops coordinator." });
    assert.equal(validatePreservation(source, tailored).valid, true);
    assert.deepEqual(
      tailored.customSections.map((s) => s.title),
      ["Languages", "Volunteer Experience", "Awards"],
    );
    const wire = toTailoredWire(tailored, source, scoreJobAlignment(source, tailored, "Retail"));
    const reloaded = canonicalizeCv(JSON.parse(JSON.stringify(toOriginalWire(canonicalizeCv(wire)))));
    assert.equal(reloaded.customSections.length, 3);
  });

  it("old sessions without customSections still canonicalize", () => {
    const cv = canonicalizeCv({ name: "A", experience: [], education: [], skills: [] });
    assert.deepEqual(cv.customSections, []);
  });
});
