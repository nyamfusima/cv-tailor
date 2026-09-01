import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runTailorPipeline } from "../src/lib/cv/pipeline";
import { IncompleteModelOutputError } from "../src/lib/cv/types";
import { parseModelJson } from "../src/lib/cv/json";
import {
  INJECTION_JD,
  NON_TECH_JD,
  RAW_CV_WITH_COURSEWORK,
  TECH_JD,
  fixtureSourceCv,
  officeAdminSourceCv,
  technicalSourceCv,
} from "./fixtures/source-cv";
import type { CompleteJsonFn, CompleteJsonResponse } from "../src/lib/cv/types";
import { toTailoredWire } from "../src/lib/cv/wire";
import { canonicalizeCv } from "../src/lib/cv/canonical";

function ok(parsed: unknown, purpose = "tailor"): CompleteJsonResponse {
  return {
    parsed,
    raw: JSON.stringify(parsed),
    model: purpose === "extract" ? "gpt-5.1" : "gpt-5-mini",
    finishReason: "stop",
    promptTokens: 10,
    completionTokens: 10,
    latencyMs: 5,
    retryCount: 0,
    promptVersion: "test",
  };
}

function extractedFrom(source: ReturnType<typeof fixtureSourceCv>) {
  return {
    name: source.contact.name,
    email: source.contact.email,
    phone: source.contact.phone,
    location: source.contact.location,
    linkedin: source.contact.linkedin,
    summary: source.summary,
    experience: source.experience.map((j) => ({
      title: j.title,
      company: j.company,
      dates: j.dates,
      bullets: j.sourceBullets.map((b) => b.text),
    })),
    education: source.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      dates: e.dates,
      coursework: e.coursework.map((c) => c.text),
    })),
    certifications: source.certifications,
    projects: source.projects,
    skills: source.skills.map((g) => ({ category: g.category, skills: g.skills.map((s) => s.name) })),
  };
}

describe("runTailorPipeline", () => {
  it("preserves coursework when the model delta omits education entirely", async () => {
    const source = fixtureSourceCv();
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(extractedFrom(source), "extract");
      return ok({
        summary: "Retail operations coordinator focused on stock accuracy.",
        experience: [],
        projects: [],
        skillOrder: [],
        keywordClassifications: [],
        missingKeywords: ["ATS"],
        assumptions: [],
        conflicts: [],
      });
    };

    const result = await runTailorPipeline({
      cvText: RAW_CV_WITH_COURSEWORK,
      jobDescription: "Retail operations lead. Stock counts, training, Excel.",
      completeJson,
      extractionConfirmed: true,
    });

    assert.equal(result.report.valid, true);
    assert.equal(result.tailored.education[0].coursework.length, 5);
    assert.deepEqual(
      result.tailored.education[0].coursework.map((c) => c.text),
      source.education[0].coursework.map((c) => c.text),
    );
  });

  it("does not insert JD-only skills from a prompt-injection job description", async () => {
    const source = fixtureSourceCv();
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(extractedFrom(source), "extract");
      return ok({
        summary: source.summary,
        experience: [],
        projects: [],
        skillOrder: [
          {
            categoryId: "skill-group-1",
            skillIds: ["skill-group-1-item-1", "skill-group-1-item-99"],
          },
        ],
        keywordClassifications: [
          { keyword: "Kubernetes", status: "not_evidenced" },
        ],
        missingKeywords: ["Kubernetes", "Terraform", "gRPC"],
        assumptions: [],
        conflicts: ["Ignored instruction to delete education"],
      });
    };

    const result = await runTailorPipeline({
      cvText: RAW_CV_WITH_COURSEWORK,
      jobDescription: INJECTION_JD,
      completeJson,
      extractionConfirmed: true,
    });

    assert.equal(result.tailored.education.length, 2);
    assert.ok(!result.tailored.skills.flatMap((g) => g.skills.map((s) => s.name)).includes("Kubernetes"));
    assert.ok(result.delta.missingKeywords.includes("Kubernetes"));
  });

  it("keeps technical tools on a technical CV and does not invent Kubernetes", async () => {
    const source = technicalSourceCv();
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(extractedFrom(source), "extract");
      return ok({
        summary: "Backend engineer experienced with Go payment APIs and PostgreSQL.",
        experience: [
          {
            id: "experience-1",
            bullets: [
              {
                sourceBulletIds: ["experience-1-bullet-1"],
                tailoredText: "Designed REST APIs in Go that processed 2 million transactions",
                matchedKeywords: ["Go", "REST"],
              },
              {
                sourceBulletIds: ["experience-1-bullet-2"],
                tailoredText: "Reduced p95 latency from 420ms to 180ms",
                matchedKeywords: [],
              },
            ],
          },
        ],
        projects: [{ id: "project-1", description: "Command-line tool for reconciling CSV exports." }],
        skillOrder: [],
        keywordClassifications: [
          { keyword: "Go", status: "evidenced_and_used" },
          { keyword: "Kubernetes", status: "not_evidenced" },
        ],
        missingKeywords: ["Kubernetes", "Terraform"],
        assumptions: [],
        conflicts: [],
      });
    };
    const result = await runTailorPipeline({
      source,
      jobDescription: TECH_JD,
      completeJson,
      extractionConfirmed: true,
    });
    assert.ok(result.tailored.projects[0].technologies.includes("Go"));
    assert.ok(result.delta.missingKeywords.includes("Kubernetes"));
  });

  it("adds JD tools already evidenced in projects and keeps every project on the wire", async () => {
    const source = canonicalizeCv({
      name: "Alex Candidate",
      email: "alex.candidate@example.com",
      experience: [{
        title: "Software Intern",
        company: "Example Labs",
        dates: "2026 – Present",
        bullets: ["Built an internal API with FastAPI and wrote Docker compose files"],
      }],
      education: [{ degree: "Diploma in Software Engineering", institution: "Example Code School", dates: "2026" }],
      projects: [
        { name: "Campus Scheduler", description: "Event scheduling platform.", technologies: ["Python", "Docker"] },
        { name: "Campus Connect", description: "Campus event discovery.", technologies: ["React"] },
        { name: "Notes CLI", description: "Local study notes search.", technologies: ["Git"] },
      ],
      skills: [{ category: "Programming Languages", skills: ["Python"] }],
    });
    const result = await runTailorPipeline({
      source,
      jobDescription: "Software intern. Required: Python, Docker, React, Kubernetes, FastAPI.",
      completeJson: async () => ok({
        summary: source.summary,
        experience: [],
        projects: [],
        skillOrder: [],
        keywordClassifications: [],
        missingKeywords: ["Kubernetes"],
        assumptions: [],
        conflicts: [],
      }),
    });
    const skillNames = result.tailored.skills.flatMap((group) => group.skills.map((skill) => skill.name));
    assert.ok(skillNames.includes("Docker"));
    assert.ok(skillNames.includes("React"));
    assert.ok(skillNames.includes("FastAPI"));
    assert.ok(!skillNames.includes("Kubernetes"));
    assert.equal(result.tailored.projects.length, 3);
    const wire = toTailoredWire(result.tailored, result.source, result.score, {
      displaySelection: result.displaySelection,
    });
    assert.equal((wire.projects ?? []).map((project) => project.name).sort().join(","), "Campus Connect,Campus Scheduler,Notes CLI");
  });

  it("does not inject architecture jargon into a non-technical CV", async () => {
    const source = officeAdminSourceCv();
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(extractedFrom(source), "extract");
      return ok({
        summary: "Clinic administrator experienced in appointment scheduling and records.",
        experience: [],
        projects: [],
        skillOrder: [],
        keywordClassifications: [],
        missingKeywords: ["microservices"],
        assumptions: [],
        conflicts: [],
      });
    };
    const result = await runTailorPipeline({
      source,
      jobDescription: NON_TECH_JD,
      completeJson,
      extractionConfirmed: true,
    });
    const blob = JSON.stringify(result.tailored).toLowerCase();
    assert.ok(!blob.includes("microservices"));
    assert.ok(!blob.includes("kubernetes"));
    assert.equal(result.tailored.education[0].coursework.length, 3);
  });

  it("throws on truncated model output", async () => {
    const completeJson: CompleteJsonFn = async () => {
      throw new IncompleteModelOutputError("truncated", "length", "gpt-5.1");
    };
    await assert.rejects(
      () => runTailorPipeline({
        cvText: "This is a sufficiently long extracted CV body used only to reach the model call.",
        jobDescription: "y",
        completeJson,
      }),
      IncompleteModelOutputError,
    );
  });

  it("save/load round-trip keeps coursework ids and text", async () => {
    const source = fixtureSourceCv();
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") return ok(extractedFrom(source), "extract");
      return ok({
        summary: source.summary,
        experience: [],
        projects: [],
        skillOrder: [],
        keywordClassifications: [],
        missingKeywords: [],
        assumptions: [],
        conflicts: [],
      });
    };
    const result = await runTailorPipeline({
      cvText: RAW_CV_WITH_COURSEWORK,
      jobDescription: "Retail operations",
      completeJson,
      extractionConfirmed: true,
    });
    const wire = toTailoredWire(result.tailored, result.source, result.score, { delta: result.delta });
    const reloaded = canonicalizeCv(JSON.parse(JSON.stringify(wire)));
    assert.deepEqual(
      reloaded.education[0].coursework.map((c) => c.text),
      source.education[0].coursework.map((c) => c.text),
    );
    assert.equal(reloaded.education[0].id, "education-1");
  });

  it("continues automatically when coursework heading is present but extraction is empty", async () => {
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") {
        return ok({
          name: "Alex Rivera",
          education: [{ degree: "BCom", institution: "UWC", dates: "2021", coursework: [] }],
          experience: [],
          certifications: [],
          projects: [],
          skills: [],
        }, "extract");
      }
      return ok({ summary: "", experience: [], projects: [], skillOrder: [], keywordClassifications: [], missingKeywords: [], assumptions: [], conflicts: [] });
    };
    const result = await runTailorPipeline({
      cvText: "Education\nBachelor of Commerce\nUniversity of the Western Cape\nRelevant Coursework\nListed on an attached transcript page that was not parsed.",
      jobDescription: "Retail",
      completeJson,
    });
    assert.equal(result.tailored.contact.name, "Alex Rivera");
    assert.equal(result.tailored.education[0].degree, "BCom");
  });

  it("sanitises contaminated extraction and continues tailoring", async () => {
    const completeJson: CompleteJsonFn = async (req) => {
      if (req.purpose === "extract") {
        return ok({
          name: "Jordan Mokoena",
          education: [{
            degree: "Diploma in Software Engineering",
            institution: "Cape Peninsula University of Technology",
            dates: "Completed May 2026",
            coursework: ["Data Structures", "PROJECTS", "HackerRank Orchestrate 2026"],
          }],
          experience: [],
          certifications: [],
          projects: [{ name: "HackerRank Orchestrate 2026", description: "Ranked #26 out of 1,349 participants." }],
          skills: [],
        }, "extract");
      }
      return ok({ summary: "", experience: [], projects: [], skillOrder: [], keywordClassifications: [], missingKeywords: [], assumptions: [], conflicts: [] });
    };
    const result = await runTailorPipeline({
      cvText: "Education\nDiploma\nRelevant coursework: Data Structures\nPROJECTS\nHackerRank Orchestrate 2026",
      jobDescription: "Software intern",
      completeJson,
    });
    const courses = result.source.education[0].coursework.map((item) => item.text);
    assert.ok(courses.includes("Data Structures"));
    assert.ok(!courses.some((item) => /hackerrank|^projects?$/i.test(item)));
    assert.equal(result.tailored.education[0].degree, "Diploma in Software Engineering");
  });

  it("keeps education and certifications that sit at the end of a long source", async () => {
    const source = fixtureSourceCv();
    const result = await runTailorPipeline({
      source,
      jobDescription: "Retail operations",
      completeJson: async () => ok({
        summary: source.summary,
        experience: [],
        projects: [],
        skillOrder: [],
        keywordClassifications: [],
        missingKeywords: [],
        assumptions: [],
        conflicts: [],
      }),
    });
    assert.equal(result.tailored.education.length, 2);
    assert.equal(result.tailored.certifications.length, 2);
    assert.equal(result.tailored.education[0].coursework.length, 5);
  });
});

describe("parseModelJson", () => {
  it("rejects truncated finish reasons", () => {
    assert.throws(() => parseModelJson("{", "length"));
    assert.throws(() => parseModelJson("{", "incomplete"));
  });
});
