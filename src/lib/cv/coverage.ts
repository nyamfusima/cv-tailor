export interface RenderCoverageRow {
  field: string;
  ui: string;
  pdf: string;
  test: string;
}

export const RENDER_COVERAGE: RenderCoverageRow[] = [
  { field: "name / contact", ui: "results/TailoredCVCard header", pdf: "ResumeDocument/DocumentHeader", test: "tests/pdf-coursework.test.ts" },
  { field: "summary", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Section Summary", test: "tests/pdf-coursework.test.ts" },
  { field: "skills", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Key Skills", test: "tests/pdf-coursework.test.ts" },
  { field: "experience", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Experience", test: "tests/pdf-coursework.test.ts" },
  { field: "education", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Education", test: "tests/pdf-coursework.test.ts" },
  { field: "education.coursework", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Note coursework", test: "tests/pdf-coursework.test.ts" },
  { field: "certifications", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Certifications", test: "tests/pdf-coursework.test.ts" },
  { field: "projects", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument/Projects", test: "tests/pdf-roundtrip.test.ts" },
  { field: "customSections", ui: "results/TailoredCVCard + CVSections", pdf: "ResumeDocument custom Section", test: "tests/pdf-roundtrip.test.ts" },
  { field: "references", ui: "results/TailoredCVCard editor", pdf: "ResumeDocument/References", test: "tests/pdf-coursework.test.ts" },
];
