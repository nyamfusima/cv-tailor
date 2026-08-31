import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courseworkDisplay, toTailoredWire } from "../src/lib/cv/wire";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { RENDER_COVERAGE } from "../src/lib/cv/coverage";
import { fixtureSourceCv } from "./fixtures/source-cv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("PDF / UI coursework rendering", () => {
  it("exposes coursework as a single display string used by the PDF template", () => {
    const source = fixtureSourceCv();
    const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
    const score = scoreJobAlignment(source, tailored, "Retail operations");
    const wire = toTailoredWire(tailored, source, score);
    const line = courseworkDisplay(wire.education[0].coursework);
    assert.ok(line);
    assert.match(line!, /Business Statistics/);
    assert.match(line!, /Retail Operations/);
    assert.ok(!line!.includes("…"));
  });

  it("keeps the PDF template wired to courseworkDisplay", () => {
    const pdfSource = readFileSync(join(process.cwd(), "src/lib/generatePDF.tsx"), "utf8");
    assert.match(pdfSource, /courseworkDisplay\(edu\.coursework\)/);
    assert.match(pdfSource, /Relevant coursework:/);
  });

  it("documents schema → UI → PDF → test coverage including coursework", () => {
    const coursework = RENDER_COVERAGE.find((row) => row.field === "education.coursework");
    assert.ok(coursework);
    assert.match(coursework!.ui, /results/);
    assert.match(coursework!.pdf, /coursework/i);
    assert.match(coursework!.test, /pdf-coursework/);
  });
});
