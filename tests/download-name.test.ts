import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobTitleFromDescription, tailoredDownloadFileName } from "../src/lib/cv/downloadName";

describe("tailoredDownloadFileName", () => {
  it("uses first_name last_name - jobRole", () => {
    assert.equal(
      tailoredDownloadFileName({
        name: "Alex Rivera",
        experience: [{ title: "Operations Coordinator", company: "BrightMart", dates: "", bullets: [] }],
        meta: {
          fileName: "upload",
          primaryRole: "Operations Coordinator",
          jobDescriptionPreview: "Retail operations lead\nManage stock counts.",
        },
      }),
      "Alex_Rivera - Retail operations lead.pdf",
    );
  });

  it("joins remaining name parts after the first name", () => {
    assert.equal(
      tailoredDownloadFileName({
        name: "Mary Jane Watson",
        experience: [{ title: "Analyst", company: "Labs", dates: "", bullets: [] }],
        meta: { fileName: "upload", primaryRole: "Data Analyst", jobDescriptionPreview: "" },
      }),
      "Mary_Jane_Watson - Data Analyst.pdf",
    );
  });

  it("falls back to the current title when the job description has no title line", () => {
    assert.equal(
      tailoredDownloadFileName({
        name: "Jordan",
        experience: [{ title: "Software Engineer", company: "PayLedger", dates: "", bullets: [] }],
      }),
      "Jordan - Software Engineer.pdf",
    );
  });

  it("strips illegal filename characters", () => {
    assert.equal(
      tailoredDownloadFileName({
        name: "Alex Rivera",
        experience: [],
        meta: {
          fileName: "upload",
          primaryRole: "Engineer",
          jobDescriptionPreview: "Backend: Platform Engineer?",
        },
      }),
      "Alex_Rivera - Backend Platform Engineer.pdf",
    );
  });
});

describe("jobTitleFromDescription", () => {
  it("takes the first title-like line of a job description", () => {
    assert.equal(
      jobTitleFromDescription(`
Senior Backend Engineer
Build payment APIs in Go.
`),
      "Senior Backend Engineer",
    );
  });
});
