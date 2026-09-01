import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalizeCv, recoverCourseworkFromText } from "../src/lib/cv/canonical";
import { fixtureSourceCv, RAW_CV_WITH_COURSEWORK } from "./fixtures/source-cv";

describe("canonicalizeCv", () => {
  it("stamps stable ids on experience, education, coursework, certs, projects and skills", () => {
    const cv = fixtureSourceCv();
    assert.equal(cv.experience[0].id, "experience-1");
    assert.equal(cv.experience[0].sourceBullets[1].id, "experience-1-bullet-2");
    assert.equal(cv.education[0].id, "education-1");
    assert.equal(cv.education[0].coursework[2].id, "education-1-coursework-3");
    assert.equal(cv.education[0].coursework[2].text, "Organisational Behaviour");
    assert.equal(cv.education[1].id, "education-2");
    assert.equal(cv.certifications[1].id, "certification-2");
    assert.equal(cv.projects[0].id, "project-1");
    assert.equal(cv.skills[0].skills[0].id, "skill-group-1-item-1");
  });

  it("keeps empty optional sections as empty arrays", () => {
    const cv = canonicalizeCv({
      name: "A",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      summary: "",
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      skills: [],
    });
    assert.deepEqual(cv.certifications, []);
    assert.deepEqual(cv.projects, []);
    assert.deepEqual(cv.education, []);
  });

  it("recovers coursework from raw text when extraction left it empty", () => {
    const recovered = recoverCourseworkFromText(RAW_CV_WITH_COURSEWORK);
    assert.ok(recovered.includes("Business Statistics"));
    assert.ok(recovered.includes("Retail Operations"));

    const cv = canonicalizeCv(
      {
        name: "Alex Rivera",
        education: [
          {
            degree: "Bachelor of Commerce in Management",
            institution: "University of the Western Cape",
            dates: "2018 – 2021",
            coursework: [],
          },
        ],
      },
      RAW_CV_WITH_COURSEWORK,
    );
    assert.ok(cv.education[0].coursework.length >= 5);
    assert.ok(cv.education[0].coursework.some((c) => c.text === "Financial Accounting"));
  });

  it("does not append recovered items when extraction already returned a credible list", () => {
    const cv = canonicalizeCv(
      {
        education: [
          {
            degree: "BCom",
            institution: "UWC",
            dates: "2018 – 2021",
            coursework: ["Business Statistics", "Supply Chain Management"],
          },
        ],
      },
      RAW_CV_WITH_COURSEWORK,
    );
    assert.deepEqual(
      cv.education[0].coursework.map((c) => c.text),
      ["Business Statistics", "Supply Chain Management"],
    );
  });

  it("splits a comma-separated coursework string into individual titles", () => {
    const cv = canonicalizeCv({
      education: [{
        degree: "BSc",
        institution: "UCT",
        dates: "2022 – 2025",
        coursework: ["Python, Java, Data Structures, Machine Learning"],
      }],
      projects: [{
        name: "Campus App",
        description: "Built a Python and Java campus app used by 3,000+ active users.",
      }],
    });
    assert.deepEqual(
      cv.education[0].coursework.map((item) => item.text),
      ["Python", "Java", "Data Structures", "Machine Learning"],
    );
  });

  it("does not turn a Technologies line into coursework titles", () => {
    const cv = canonicalizeCv({
      education: [{
        degree: "Diploma",
        institution: "CPUT",
        dates: "2026",
        coursework: [
          "Data Structures",
          "Technologies: Python, TypeScript, PostgreSQL",
        ],
      }],
      projects: [{ name: "Campus Connect", description: "Campus app.", technologies: ["Python", "TypeScript", "PostgreSQL"] }],
    });
    assert.deepEqual(
      cv.education[0].coursework.map((item) => item.text),
      ["Data Structures"],
    );
  });
});
