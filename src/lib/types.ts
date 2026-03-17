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

export interface SkillCategory {
  category: string;
  skills: string[];
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
  skills: SkillCategory[];
  matchScore: number;
}