import type { OriginalCV, TailoredCV } from "../types";
import { jobTitleFromDescription } from "./downloadName";
import type { DisplaySelection } from "./displaySelection";
import { applyDisplaySelection } from "./displaySelection";
import { filterCourseworkLabels } from "./displayText";
import type { HardRequirements } from "./hardRequirements";
import type { SectionIntegrityReport } from "./sectionIntegrity";
import type { AlignmentScore, CanonicalCV, PreservationReport, TailorDelta } from "./types";

export function toOriginalWire(cv: CanonicalCV): OriginalCV {
  return {
    name: cv.contact.name,
    email: cv.contact.email,
    phone: cv.contact.phone,
    location: cv.contact.location,
    linkedin: cv.contact.linkedin,
    summary: cv.summary,
    experience: cv.experience.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      dates: job.dates,
      bullets: job.sourceBullets.map((b) => b.text),
      sourceBullets: job.sourceBullets,
    })),
    education: cv.education.map((edu) => ({
      id: edu.id,
      degree: edu.degree,
      institution: edu.institution,
      dates: edu.dates,
      coursework: edu.coursework.map((c) => c.text),
      courseworkIds: edu.coursework.map((c) => c.id),
    })),
    certifications: cv.certifications.map((cert) => ({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
    })),
    projects: cv.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
      dates: project.dates,
    })),
    skills: cv.skills.map((group) => ({
      id: group.id,
      category: group.category,
      skills: group.skills.map((s) => s.name),
      skillIds: group.skills.map((s) => s.id),
    })),
    customSections: cv.customSections,
  };
}

export function toTailoredWire(
  tailored: CanonicalCV,
  source: CanonicalCV,
  score: AlignmentScore,
  extras: {
    delta?: TailorDelta;
    report?: PreservationReport;
    modelUsed?: string;
    promptVersion?: string;
    fileName?: string;
    primaryRole?: string;
    jobDescriptionPreview?: string;
    hardRequirements?: HardRequirements;
    displaySelection?: DisplaySelection;
    sectionIntegrity?: SectionIntegrityReport;
    jobDescription?: string;
  } = {},
): TailoredCV {
  const displayJobs = extras.displaySelection
    ? applyDisplaySelection(
        tailored.experience.map((job) => ({
          id: job.id,
          bullets: job.bullets,
          sourceBullets: job.sourceBullets,
        })),
        extras.displaySelection,
      )
    : tailored.experience;
  const displayJobById = new Map(displayJobs.map((job) => [job.id, job]));
  const displayedProjects = extras.displaySelection?.projectIds.length
    ? tailored.projects.filter((project) => extras.displaySelection!.projectIds.includes(project.id))
    : tailored.projects;

  return {
    name: tailored.contact.name,
    email: tailored.contact.email,
    phone: tailored.contact.phone,
    location: tailored.contact.location,
    linkedin: tailored.contact.linkedin,
    summary: tailored.summary,
    experience: tailored.experience.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      dates: job.dates,
      bullets: displayJobById.get(job.id)?.bullets ?? job.bullets,
      sourceBullets: job.sourceBullets,
      bulletEvidence: job.bulletEvidence,
    })),
    education: tailored.education.map((edu) => ({
      id: edu.id,
      degree: edu.degree,
      institution: edu.institution,
      dates: edu.dates,
      coursework: edu.coursework.map((c) => c.text),
      courseworkIds: edu.coursework.map((c) => c.id),
    })),
    certifications: tailored.certifications.map((cert) => ({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
    })),
    projects: displayedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      technologies: project.technologies,
      url: project.url,
      dates: project.dates,
      bulletEvidence: project.bulletEvidence,
    })),
    skills: tailored.skills.map((group) => ({
      id: group.id,
      category: group.category,
      skills: group.skills.map((s) => s.name),
      skillIds: group.skills.map((s) => s.id),
    })),
    customSections: tailored.customSections,
    matchScore: score.matchScore,
    scoreBreakdown: score.scoreBreakdown,
    addedKeywords: score.addedKeywords,
    missingKeywords: extras.delta?.missingKeywords ?? score.missingKeywords,
    assumptions: extras.delta?.assumptions ?? [],
    conflicts: extras.delta?.conflicts ?? [],
    keywordClassifications: extras.delta?.keywordClassifications,
    preservation: extras.report,
    originalCV: toOriginalWire(source),
    modelUsed: extras.modelUsed,
    promptVersion: extras.promptVersion,
    hardRequirements: extras.hardRequirements,
    displaySelection: extras.displaySelection,
    sectionIntegrity: extras.sectionIntegrity,
    meta: {
      fileName: extras.fileName || "upload",
      primaryRole: extras.primaryRole
        || jobTitleFromDescription(extras.jobDescription)
        || derivePrimaryRole(tailored, source),
      jobDescriptionPreview: extras.jobDescriptionPreview || "",
    },
  };
}

export function derivePrimaryRole(tailored: CanonicalCV, original: CanonicalCV): string {
  const title = tailored.experience[0]?.title || original.experience[0]?.title || "";
  if (title) return title;
  const summary = (tailored.summary || original.summary || "").trim();
  return summary ? summary.split(/[.|\n]/)[0].slice(0, 80) : "Unknown";
}

export function courseworkDisplay(coursework: string[] | undefined): string | null {
  const items = filterCourseworkLabels(coursework);
  return items.length ? items.join(", ") : null;
}
