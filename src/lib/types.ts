export interface Experience {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface Education {
  degree: string;
  institution: string;
  dates: string;
  coursework?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
  dates?: string;
}

export interface Reference {
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ScoreBreakdown {
  keywordsMatch: number;
  keywordsBefore: number;
  skillsAlignment: number;
  skillsBefore: number;
  experienceRelevance: number;
  experienceBefore: number;
}

export interface OriginalCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  skills: SkillCategory[];
}

export interface CVMeta {
  fileName: string;
  primaryRole: string;
  jobDescriptionPreview: string;
}

export interface TailoredCV {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  projects?: Project[];
  skills: SkillCategory[];
  references?: Reference[];
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  originalCV?: OriginalCV;
  meta?: CVMeta;
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface UserCredits {
  id: string;
  email: string;
  tailor_credits: number;
  pdf_credits: number;
  job_credits: number;
  total_tailors_used: number;
}