import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { extractText } from "unpdf";
import { skillCategoryLabel, stripBulletPrefix, visibleSkillGroups } from "../src/lib/cv/displayText";
import { recommendDisplaySelection } from "../src/lib/cv/displaySelection";
import { RESUME_SECTION_ORDER, sectionOrderIndexes } from "../src/lib/cv/harvardResume";
import { mergeProtectedFromSource } from "../src/lib/cv/mergeProtected";
import { scoreJobAlignment } from "../src/lib/cv/matchScore";
import { courseworkDisplay, toTailoredWire } from "../src/lib/cv/wire";
import { renderResumePdfBytes } from "../src/lib/generatePDF";
import { flattenExtractedText } from "../src/lib/parseFile";
import { DOCUMENT_PROFILES, PDF_FONTS } from "../src/lib/pdf/theme";
import { representativeTailoredCv } from "./fixtures/pdf-cv";
import { harvardSourceCv } from "./fixtures/harvard-cv";

function wireFrom(source = harvardSourceCv()) {
  const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
  const selection = recommendDisplaySelection(source, "Software intern Python TypeScript FastAPI Azure");
  return toTailoredWire(tailored, source, scoreJobAlignment(source, tailored, "Software intern"), {
    displaySelection: selection,
  });
}

describe("Harvard-style resume format", () => {
  it("PDF text order is SUMMARY → KEY SKILLS → EXPERIENCE → EDUCATION → PROJECTS", async () => {
    const bytes = await renderResumePdfBytes(wireFrom());
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    const order = sectionOrderIndexes(blob);
    assert.ok(order.SUMMARY >= 0);
    assert.ok(order["KEY SKILLS"] > order.SUMMARY);
    assert.ok(order.EXPERIENCE > order["KEY SKILLS"]);
    assert.ok(order.EDUCATION > order.EXPERIENCE);
    assert.ok(order.PROJECTS > order.EDUCATION);
    assert.deepEqual(RESUME_SECTION_ORDER.slice(0, 5), [
      "SUMMARY",
      "KEY SKILLS",
      "EXPERIENCE",
      "EDUCATION",
      "PROJECTS",
    ]);
  });

  it("KEY SKILLS occurs exactly once and category labels are bold", async () => {
    const cv = wireFrom();
    const bytes = await renderResumePdfBytes(cv);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    const matches = blob.toUpperCase().match(/KEY SKILLS/g) ?? [];
    assert.equal(matches.length, 1);
    assert.equal(visibleSkillGroups([{ category: "KEY SKILLS", skills: ["Python"] }]).length, 0);
    assert.equal(skillCategoryLabel("Backend"), "Backend:");
    assert.equal(skillCategoryLabel("KEY SKILLS"), undefined);

    const primitives = readFileSync(join(process.cwd(), "src/lib/pdf/primitives.tsx"), "utf8");
    assert.match(primitives, /rowLabel:[\s\S]*fontFamily: PDF_FONTS\.bold/);
    assert.match(primitives, /rowText:[\s\S]*flex: 1/);
    const pdf = readFileSync(join(process.cwd(), "src/lib/generatePDF.tsx"), "utf8");
    assert.match(pdf, /skillCategoryLabel\(group\.category\)/);
    assert.match(pdf, /<LabelledRow/);
  });

  it("results preview uses the same section order", () => {
    const results = readFileSync(join(process.cwd(), "src/app/results/page.tsx"), "utf8");
    const summary = results.indexOf(">Summary<");
    const skills = results.indexOf(">Key Skills<");
    const experience = results.indexOf(">Experience<");
    const education = results.indexOf(">Education<");
    const projects = results.indexOf(">Projects<");
    const certs = results.indexOf(">Certifications<");
    assert.ok(summary >= 0 && skills > summary && experience > skills);
    assert.ok(education > experience && projects > education && certs > projects);
    assert.doesNotMatch(results, /Professional Development/);
    assert.doesNotMatch(results, /reviewed source|reviewed version|confirm before/i);
  });

  it("contact is centred and present", async () => {
    const cv = wireFrom();
    assert.ok(cv.email);
    assert.ok(cv.phone);
    const primitives = readFileSync(join(process.cwd(), "src/lib/pdf/primitives.tsx"), "utf8");
    assert.match(primitives, /title:[\s\S]*textAlign: "center"/);
    assert.match(primitives, /subtitle:[\s\S]*textAlign: "center"/);
    const bytes = await renderResumePdfBytes(cv);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    assert.match(blob, /alex\.candidate@example\.com/);
    assert.match(blob, /Cape Town/);
  });

  it("experience stays reverse chronological and education stays exact", () => {
    const cv = wireFrom();
    assert.equal(cv.experience[0].title, "AI Academy Intern");
    assert.equal(cv.experience[0].dates, "2026 – Present");
    assert.equal(cv.education[0].degree, "Diploma in Software Engineering");
    assert.equal(cv.education[0].institution, "Example Code School");
    assert.equal(cv.education[0].dates, "Completed May 2026");
  });

  it("does not render or store Relevant areas: and keeps numeric tokens intact", async () => {
    const source = harvardSourceCv();
    assert.ok(!source.education[0].coursework.some((item) => /relevant areas/i.test(item.text)));
    assert.equal(courseworkDisplay(["Relevant areas:", "Generative AI"]), "Generative AI");
    const cv = wireFrom(source);
    assert.ok(!(cv.education[0].coursework ?? []).some((item) => /relevant areas/i.test(item)));
    const bytes = await renderResumePdfBytes(cv);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    assert.doesNotMatch(blob, /Relevant areas/i);
    assert.match(blob, /1,349/);
    assert.match(blob, /3,000\+/);
    const coursework = (cv.education[0].coursework ?? []).join(" ");
    assert.doesNotMatch(coursework, /Campus Scheduler|1,349|3,000/);
  });

  it("does not insert unsupported skills and keeps omitted bullets in canonical data", () => {
    const source = harvardSourceCv();
    const cv = wireFrom(source);
    const shown = cv.skills.flatMap((group) => group.skills);
    assert.ok(!shown.includes("Kubernetes"));
    assert.ok(!shown.includes("AWS"));
    assert.ok((cv.experience[0].bullets?.length ?? 0) <= 6);
    assert.equal(cv.originalCV?.experience[0].sourceBullets?.length, 8);
    assert.equal(source.experience[0].sourceBullets.length, 8);
  });

  it("strips raw bullet glyphs so only one visual bullet remains", () => {
    assert.equal(stripBulletPrefix("• Built an internal RAG prototype"), "Built an internal RAG prototype");
    assert.equal(stripBulletPrefix("- Documented API tests"), "Documented API tests");
  });

  it("old saved sessions still render", async () => {
    const legacy = JSON.parse(JSON.stringify(representativeTailoredCv()));
    delete legacy.displaySelection;
    delete legacy.sectionIntegrity;
    const bytes = await renderResumePdfBytes(legacy);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    assert.match(blob, /ALEX RIVERA/i);
    assert.match(blob, /University of the Western Cape/);
  });

  it("generated PDF stays selectable and contains protected displayed content", async () => {
    const cv = wireFrom();
    const bytes = await renderResumePdfBytes(cv);
    assert.ok(bytes.byteLength > 500);
    const { text } = await extractText(bytes, { mergePages: true });
    const blob = flattenExtractedText(text);
    assert.match(blob, /Diploma in Software Engineering/);
    assert.match(blob, /Example Code School/);
    assert.match(blob, /Completed May 2026/);
    assert.match(blob, /Generative AI/);
    assert.match(blob, /AI Academy Intern/);
    assert.match(blob, /Example Labs/);
  });

  it("uses Times fonts at readable Harvard sizes", () => {
    assert.equal(PDF_FONTS.regular, "Times-Roman");
    assert.equal(PDF_FONTS.bold, "Times-Bold");
    assert.equal(DOCUMENT_PROFILES.resume.titleFontSize, 18);
    assert.equal(DOCUMENT_PROFILES.resume.headingFontSize, 11);
    assert.ok(DOCUMENT_PROFILES.resume.fontSize >= 9.5);
    assert.ok(DOCUMENT_PROFILES.resume.fontSize <= 10.5);
  });
});
