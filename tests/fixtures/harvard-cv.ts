import { canonicalizeCv } from "../../src/lib/cv/canonical";

/** Anonymized Harvard-style source shaped like the supplied original CV. */
export const HARVARD_RAW_CV = `
ALEX CANDIDATE
alex.candidate@example.com · +27 00 000 0000 · Cape Town

SUMMARY
Software engineering graduate building AI and data tools.

KEY SKILLS
AI: Retrieval-augmented generation, speech recognition
Data & ETL: SQL, data pipelines
Programming Languages: Python, Java, TypeScript, JavaScript
Automation: Scripts, scheduled jobs
Cloud: Microsoft Azure, Storage, Cloud Applications
Backend: FastAPI, REST APIs, PostgreSQL, Supabase
Vector / NLP: Embeddings, document search
Developer Tools: Git, Docker, VS Code, Cursor
Frontend: React, Next.js

EXPERIENCE
AI Academy Intern                              2026 – Present
Example Labs
• Built an internal RAG prototype used by the training team
• Documented API tests for the booking service

EDUCATION
Diploma in Software Engineering               Completed May 2026
Example Code School
Relevant coursework: Generative AI, Python, SQL & Databases
Relevant areas:

PROJECTS
Campus Scheduler
https://example.com/scheduler
Ranked #26 out of 1,349 participants. Built an event scheduling platform.
Technologies: Python, TypeScript, PostgreSQL

Campus Connect
Prototype used by 3,000+ active users for campus event discovery.
Technologies: Java, React
`;

export function harvardExtractedSource() {
  return {
    name: "Alex Candidate",
    email: "alex.candidate@example.com",
    phone: "+27 00 000 0000",
    location: "Cape Town",
    linkedin: "",
    summary: "Software engineering graduate building AI and data tools.",
    experience: [
      {
        title: "AI Academy Intern",
        company: "Example Labs",
        dates: "2026 – Present",
        bullets: [
          "Built an internal RAG prototype used by the training team",
          "Documented API tests for the booking service",
          "Supported weekly demo scripts",
          "Tracked bugs in a shared spreadsheet",
          "Prepared release notes for supervisors",
          "Helped deploy a cloud prototype to a shared server",
          "Wrote unit tests for the scheduling service",
          "Participated in weekly code review",
        ],
      },
    ],
    education: [
      {
        degree: "Diploma in Software Engineering",
        institution: "Example Code School",
        dates: "Completed May 2026",
        coursework: [
          "Generative AI",
          "Python",
          "SQL & Databases",
          "Relevant areas:",
        ],
      },
    ],
    certifications: [],
    projects: [
      {
        name: "Campus Scheduler",
        description: "Ranked #26 out of 1,349 participants. Built an event scheduling platform.",
        technologies: ["Python", "TypeScript", "PostgreSQL"],
        url: "https://example.com/scheduler",
        dates: "",
      },
      {
        name: "Campus Connect",
        description: "Prototype used by 3,000+ active users for campus event discovery.",
        technologies: ["Java", "React"],
      },
    ],
    skills: [
      { category: "AI", skills: ["Retrieval-augmented generation", "speech recognition"] },
      { category: "Data & ETL", skills: ["SQL", "data pipelines"] },
      { category: "Programming Languages", skills: ["Python", "Java", "TypeScript", "JavaScript"] },
      { category: "Automation", skills: ["Scripts", "scheduled jobs"] },
      { category: "Cloud", skills: ["Microsoft Azure", "Storage", "Cloud Applications"] },
      { category: "Backend", skills: ["FastAPI", "REST APIs", "PostgreSQL", "Supabase"] },
      { category: "Vector / NLP", skills: ["Embeddings", "document search"] },
      { category: "Developer Tools", skills: ["Git", "Docker", "VS Code", "Cursor"] },
      { category: "Frontend", skills: ["React", "Next.js"] },
    ],
  };
}

export function harvardSourceCv() {
  return canonicalizeCv(harvardExtractedSource(), HARVARD_RAW_CV);
}
