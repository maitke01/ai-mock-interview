export interface ResumeDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  parsedContent: ParsedResumeContent;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: ResumeMetadata;
}

export interface ParsedResumeContent {
  personalInfo: PersonalInfo;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  projects?: Project[];
  certifications?: Certification[];
  achievements?: string[];
  languages?: Language[];
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface WorkExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description: string;
  achievements: string[];
  keywords: string[];
}

export interface Education {
  degree: string;
  institution: string;
  location?: string;
  graduationDate: string;
  gpa?: string;
  relevantCourses?: string[];
}

export interface Project {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  achievements?: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface Language {
  language: string;
  proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Native';
}

export interface ResumeMetadata {
  industry?: string;
  targetRole?: string;
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Executive';
  fileFormat: 'pdf' | 'docx' | 'txt';
  originalFileName?: string;
  wordCount: number;
  lastAnalyzed?: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  analysisType: AnalysisType;
  score: number;
  feedback: AnalysisFeedback;
  suggestions: string[];
  missingKeywords: string[];
  createdAt: string;
  version: number;
}

export interface AnalysisFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  atsCompatibility: ATSCompatibility;
  contentAnalysis: ContentAnalysis;
  formattingAnalysis: FormattingAnalysis;
}

export interface ATSCompatibility {
  score: number;
  issues: string[];
  suggestions: string[];
  keywordDensity: number;
}

export interface ContentAnalysis {
  clarity: number;
  impact: number;
  relevance: number;
  quantifiability: number;
  actionVerbUsage: number;
}

export interface FormattingAnalysis {
  consistency: number;
  readability: number;
  structure: number;
  length: number;
}

export type AnalysisType =
  | 'comprehensive'
  | 'ats-optimization'
  | 'interview-prep'
  | 'career-advice'
  | 'keyword-matching'
  | 'gap-detection'
  | 'industry-specific';

export interface JobMatchAnalysis {
  id: string;
  resumeId: string;
  jobDescription: string;
  matchScore: number;
  keywordMatches: KeywordMatch[];
  missingKeywords: string[];
  suggestions: string[];
  createdAt: string;
}

export interface KeywordMatch {
  keyword: string;
  resumeCount: number;
  jobDescriptionCount: number;
  importance: 'high' | 'medium' | 'low';
  category: 'skill' | 'experience' | 'tool' | 'certification' | 'industry';
}

export interface ResumeTemplate {
  id: string;
  name: string;
  category: string;
  industry: string[];
  experienceLevel: string[];
  description: string;
  sections: TemplateSection[];
  formatting: TemplateFormatting;
  createdAt: string;
}

export interface TemplateSection {
  name: string;
  required: boolean;
  order: number;
  guidelines: string[];
}

export interface TemplateFormatting {
  font: string;
  fontSize: number;
  margins: string;
  lineSpacing: number;
  sectionSpacing: number;
  bulletStyle: string;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  version: number;
  content: string;
  parsedContent: ParsedResumeContent;
  changes: string[];
  createdAt: string;
  createdBy: string;
}

export interface ResumeAnalytics {
  id: string;
  resumeId: string;
  views: number;
  downloads: number;
  analyses: number;
  lastViewed?: string;
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  averageAnalysisScore: number;
  improvementTrend: number;
  mostCommonIssues: string[];
  strengthAreas: string[];
}