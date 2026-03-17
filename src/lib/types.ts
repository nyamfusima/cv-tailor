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
  skills: SkillCategory[];
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
  skills: SkillCategory[];
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  originalCV?: OriginalCV;
}