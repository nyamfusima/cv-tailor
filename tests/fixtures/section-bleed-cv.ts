import { canonicalizeCv } from "../../src/lib/cv/canonical";

export const AMAZON_SDE_JD = `
Software Development Engineer Intern
Bachelor's degree or above in a related STEM field required.
Graduation window: October 2025 to September 2026 or within 24 months of start.
Programming languages: Python, Java, or TypeScript.
Preferred: AWS, CI/CD, monitoring, on-call, fault tolerance, distributed systems, cloud-native architecture, enterprise-scale platforms, operational stability.
`;

export const SECTION_BLEED_RAW_CV = `
Jordan Mokoena
jordan.mokoena@example.com | Cape Town

Summary
Software engineering graduate who builds campus tools in Python and TypeScript.

Experience
Software Intern — Harbour Labs
Jan 2025 – Apr 2026
• Assisted teammates with Python API tests
• Supported a campus booking integration
• Participated in weekly code review
• Wrote unit tests for the scheduling service
• Documented the client software release notes
• Helped deploy a cloud prototype to a shared server
• Tracked bugs in a spreadsheet
• Prepared demo scripts for supervisors

Education
Diploma in Software Engineering
Cape Peninsula University of Technology
Completed May 2026
Relevant coursework: Data Structures, Databases, Software Testing, Operating Systems
Relevant areas: Algorithms, Computer Networks

PROJECTS
HackerRank Orchestrate 2026
Ranked #26 out of 1,349 participants. Built an event scheduling platform.
Technologies: Python, TypeScript, PostgreSQL

Campus Connect
Prototype used by 3,000+ active users for campus event discovery.
Technologies: Java, React

Skills
Languages: Python, Java, TypeScript
`;

export const VALID_BLEED_COURSES = [
  "Data Structures",
  "Databases",
  "Software Testing",
  "Operating Systems",
  "Algorithms",
  "Computer Networks",
];

export function extractedBleedSource() {
  return {
    name: "Jordan Mokoena",
    email: "jordan.mokoena@example.com",
    phone: "",
    location: "Cape Town",
    linkedin: "",
    summary: "Software engineering graduate who builds campus tools in Python and TypeScript.",
    experience: [
      {
        title: "Software Intern",
        company: "Harbour Labs",
        dates: "Jan 2025 – Apr 2026",
        bullets: [
          "Assisted teammates with Python API tests",
          "Supported a campus booking integration",
          "Participated in weekly code review",
          "Wrote unit tests for the scheduling service",
          "Documented the client software release notes",
          "Helped deploy a cloud prototype to a shared server",
          "Tracked bugs in a spreadsheet",
          "Prepared demo scripts for supervisors",
        ],
      },
    ],
    education: [
      {
        degree: "Diploma in Software Engineering",
        institution: "Cape Peninsula University of Technology",
        dates: "Completed May 2026",
        coursework: [...VALID_BLEED_COURSES],
      },
    ],
    certifications: [],
    projects: [
      {
        name: "HackerRank Orchestrate 2026",
        description: "Ranked #26 out of 1,349 participants. Built an event scheduling platform.",
        technologies: ["Python", "TypeScript", "PostgreSQL"],
      },
      {
        name: "Campus Connect",
        description: "Prototype used by 3,000+ active users for campus event discovery.",
        technologies: ["Java", "React"],
      },
    ],
    skills: [{ category: "Languages", skills: ["Python", "Java", "TypeScript"] }],
  };
}

export function cleanBleedSourceCv() {
  return canonicalizeCv(extractedBleedSource(), SECTION_BLEED_RAW_CV);
}

export function contaminatedReviewedSource() {
  const clean = extractedBleedSource();
  return {
    ...clean,
    education: [
      {
        ...clean.education[0],
        coursework: [
          ...VALID_BLEED_COURSES,
          "Relevant areas:",
          "PROJECTS",
          "HackerRank Orchestrate 2026",
          "Ranked #26 out of 1,349 participants. Built an event scheduling platform.",
          "Technologies: Python, TypeScript, PostgreSQL",
          "1",
          "349 participants",
          "000+ active users",
        ],
      },
    ],
  };
}
