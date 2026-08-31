import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractText } from "unpdf";
import { renderResumePdfBytes } from "../src/lib/generatePDF";
import { flattenExtractedText } from "../src/lib/parseFile";
import { representativeTailoredCv } from "./fixtures/pdf-cv";
import { DOCUMENT_PROFILES, PDF_FONTS } from "../src/lib/pdf/theme";

describe("generated PDF text", () => {
  it("contains protected fixture content in extracted PDF text", async () => {
    const cv = representativeTailoredCv();
    const bytes = await renderResumePdfBytes(cv);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);

    assert.match(blob, /ALEX RIVERA/i);
    assert.match(blob, /alex\.rivera@example.com/);
    assert.match(blob, /Operations Coordinator/);
    assert.match(blob, /BrightMart Retail/);
    assert.match(blob, /Sales Associate/);
    assert.match(blob, /Harbour Market/);
    assert.match(blob, /stock counts/);
    assert.match(blob, /University of the Western Cape/);
    assert.match(blob, /Bachelor of Commerce/);
    assert.match(blob, /Business Statistics/);
    assert.match(blob, /Supply Chain Management/);
    assert.match(blob, /Organisational Behaviour/);
    assert.match(blob, /Financial Accounting/);
    assert.match(blob, /Retail Oper-?\s*ations/);
    assert.match(blob, /First Aid Level 1/);
    assert.match(blob, /Store Launch Tracker/);
    assert.match(blob, /Languages/i);
    assert.match(blob, /English/);
    assert.match(blob, /Volunteer Experience/i);
    assert.match(blob, /community shop/);

    const nameAt = blob.toLowerCase().indexOf("alex rivera");
    const experienceAt = blob.toLowerCase().indexOf("experience");
    const educationAt = blob.toLowerCase().indexOf("education");
    assert.ok(nameAt >= 0 && experienceAt > nameAt);
    assert.ok(educationAt > experienceAt);
  });

  it("documents the resume template as selectable single-column text", () => {
    assert.equal(DOCUMENT_PROFILES.resume.fontSize, 10);
    assert.equal(PDF_FONTS.regular, "Times-Roman");
  });
});
