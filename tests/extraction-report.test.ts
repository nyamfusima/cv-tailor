import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv } from "../src/lib/cv/canonical";
import { buildExtractionReport } from "../src/lib/cv/extractionReport";
import { fixtureSourceCv, RAW_CV_WITH_COURSEWORK } from "./fixtures/source-cv";

describe("extraction completeness", () => {
  it("warns when a Coursework heading is present but canonical coursework is empty", () => {
    const source = canonicalizeCv({
      name: "Alex Rivera",
      education: [{ degree: "BCom", institution: "UWC", dates: "2018 – 2021", coursework: [] }],
    });
    const report = buildExtractionReport({
      cvText: "Education\nBCom\nRelevant Coursework: Business Statistics, Retail Operations",
      source,
    });
    assert.equal(report.highConfidence, true);
    assert.equal(report.requiresUserReview, true);
    assert.ok(report.warnings.some((w) => /coursework heading/i.test(w)));
  });

  it("warns when Certifications heading has no extracted certs", () => {
    const source = canonicalizeCv({ name: "A", education: [], certifications: [] });
    const report = buildExtractionReport({
      cvText: "Certifications\nFirst Aid Level 1",
      source,
    });
    assert.ok(report.warnings.some((w) => /certifications heading/i.test(w)));
  });

  it("warns when Education heading has no entries", () => {
    const source = canonicalizeCv({ name: "A", education: [] });
    const report = buildExtractionReport({ cvText: "Education\nUniversity of X", source });
    assert.ok(report.warnings.some((w) => /education heading/i.test(w)));
  });

  it("flags short or image-only extracts", () => {
    const source = canonicalizeCv({});
    const report = buildExtractionReport({ cvText: "   ", source, isLikelyImageOnly: true });
    assert.equal(report.isLikelyImageOnly, true);
    assert.ok(report.warnings.some((w) => /image-only|short/i.test(w)));
  });

  it("does not warn when extracted coursework matches the heading", () => {
    const source = fixtureSourceCv();
    const report = buildExtractionReport({ cvText: RAW_CV_WITH_COURSEWORK, source });
    assert.ok(!report.warnings.some((w) => /coursework heading/i.test(w)));
  });
});
