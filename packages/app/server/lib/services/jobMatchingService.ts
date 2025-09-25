import type { ParsedResumeContent, JobMatchAnalysis, KeywordMatch } from '../models/resumeModels';

export interface JobDescriptionAnalysis {
  requiredSkills: KeywordExtraction[];
  preferredSkills: KeywordExtraction[];
  experienceLevel: string;
  industry: string;
  role: string;
  companySize?: string;
  benefits?: string[];
  responsibilities: string[];
  qualifications: string[];
}

export interface KeywordExtraction {
  keyword: string;
  frequency: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  category: 'technical' | 'soft' | 'certification' | 'tool' | 'industry' | 'experience';
  context: string[];
}

export interface MatchScore {
  overall: number;
  breakdown: {
    skills: number;
    experience: number;
    education: number;
    keywords: number;
    qualifications: number;
  };
  confidence: number;
}

export interface ActionableRecommendation {
  type: 'add_keyword' | 'improve_section' | 'add_experience' | 'get_certification' | 'reformat';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: number; // Expected score improvement
  effort: number; // Difficulty level 1-5
  specificSuggestion: string;
}

export class JobMatchingService {

  static async analyzeJobDescription(
    env: Env,
    jobDescription: string
  ): Promise<JobDescriptionAnalysis> {
    try {
      const prompt = `Analyze this job description and extract structured information:

"${jobDescription}"

Please identify and categorize:
1. Required skills (must-have)
2. Preferred skills (nice-to-have)
3. Experience level required
4. Industry/sector
5. Job role/title
6. Key responsibilities
7. Qualifications needed

Format your response as structured data focusing on actionable elements.`;

      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are an expert job description analyst. Extract structured information that can be used for resume matching.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return this.parseJobAnalysisResponse(response.response || response, jobDescription);

    } catch (error) {
      console.error('Error analyzing job description:', error);
      return this.fallbackJobAnalysis(jobDescription);
    }
  }

  static async performDetailedJobMatch(
    env: Env,
    resume: ParsedResumeContent,
    jobDescription: string
  ): Promise<JobMatchAnalysis> {
    try {
      const jobAnalysis = await this.analyzeJobDescription(env, jobDescription);

      // Extract keywords from both resume and job description
      const resumeKeywords = this.extractResumeKeywords(resume);
      const jobKeywords = [...jobAnalysis.requiredSkills, ...jobAnalysis.preferredSkills];

      // Perform semantic matching
      const keywordMatches = await this.matchKeywords(env, resumeKeywords, jobKeywords);

      // Calculate match score
      const matchScore = this.calculateMatchScore(resume, jobAnalysis, keywordMatches);

      // Identify missing keywords
      const missingKeywords = this.identifyMissingKeywords(jobKeywords, resumeKeywords);

      // Generate actionable suggestions
      const suggestions = await this.generateActionableSuggestions(
        env,
        resume,
        jobAnalysis,
        matchScore,
        missingKeywords
      );

      return {
        id: crypto.randomUUID(),
        resumeId: '',
        jobDescription,
        matchScore: matchScore.overall,
        keywordMatches,
        missingKeywords,
        suggestions,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error performing job match:', error);
      throw new Error(`Job matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static parseJobAnalysisResponse(response: string, originalJob: string): JobDescriptionAnalysis {
    // Parse AI response into structured format
    const lines = response.split('\n').filter(line => line.trim());

    const requiredSkills: KeywordExtraction[] = [];
    const preferredSkills: KeywordExtraction[] = [];
    let currentSection = '';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('required') || lowerLine.includes('must have')) {
        currentSection = 'required';
      } else if (lowerLine.includes('preferred') || lowerLine.includes('nice to have')) {
        currentSection = 'preferred';
      } else if (line.match(/^[-*•\d+\.]\s+/) && currentSection) {
        const keyword = line.replace(/^[-*•\d+\.]\s*/, '').trim();
        const extraction: KeywordExtraction = {
          keyword,
          frequency: 1,
          importance: currentSection === 'required' ? 'high' : 'medium',
          category: this.categorizeKeyword(keyword),
          context: [keyword]
        };

        if (currentSection === 'required') {
          requiredSkills.push(extraction);
        } else {
          preferredSkills.push(extraction);
        }
      }
    }

    return {
      requiredSkills,
      preferredSkills,
      experienceLevel: this.extractExperienceLevel(originalJob),
      industry: this.extractIndustry(originalJob),
      role: this.extractRole(originalJob),
      responsibilities: this.extractResponsibilities(originalJob),
      qualifications: this.extractQualifications(originalJob)
    };
  }

  private static fallbackJobAnalysis(jobDescription: string): JobDescriptionAnalysis {
    return {
      requiredSkills: this.extractBasicKeywords(jobDescription, 'required'),
      preferredSkills: this.extractBasicKeywords(jobDescription, 'preferred'),
      experienceLevel: this.extractExperienceLevel(jobDescription),
      industry: 'Technology', // Default
      role: 'Professional',
      responsibilities: [],
      qualifications: []
    };
  }

  private static extractBasicKeywords(text: string, type: 'required' | 'preferred'): KeywordExtraction[] {
    const commonSkills = [
      'javascript', 'python', 'react', 'node', 'sql', 'git', 'aws', 'docker',
      'leadership', 'communication', 'teamwork', 'problem solving'
    ];

    return commonSkills
      .filter(skill => text.toLowerCase().includes(skill))
      .map(skill => ({
        keyword: skill,
        frequency: 1,
        importance: type === 'required' ? 'high' : 'medium' as const,
        category: this.categorizeKeyword(skill),
        context: [skill]
      }));
  }

  private static categorizeKeyword(keyword: string): KeywordExtraction['category'] {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerKeyword.match(/(javascript|python|java|react|angular|vue|node|sql|html|css)/)) {
      return 'technical';
    }
    if (lowerKeyword.match(/(aws|azure|docker|kubernetes|jenkins|git)/)) {
      return 'tool';
    }
    if (lowerKeyword.match(/(certification|certified|license)/)) {
      return 'certification';
    }
    if (lowerKeyword.match(/(leadership|communication|teamwork|management)/)) {
      return 'soft';
    }
    if (lowerKeyword.match(/(years|experience|senior|junior)/)) {
      return 'experience';
    }

    return 'industry';
  }

  private static extractExperienceLevel(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('entry level') || lowerText.includes('junior')) return 'Entry';
    if (lowerText.includes('senior') || lowerText.includes('lead')) return 'Senior';
    if (lowerText.includes('principal') || lowerText.includes('architect')) return 'Executive';
    if (lowerText.match(/\d+\+?\s*years/)) {
      const yearMatch = lowerText.match(/(\d+)\+?\s*years/);
      const years = yearMatch ? parseInt(yearMatch[1]) : 0;
      if (years <= 2) return 'Entry';
      if (years <= 5) return 'Mid';
      return 'Senior';
    }

    return 'Mid';
  }

  private static extractIndustry(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/(fintech|finance|banking|financial)/)) return 'Financial Services';
    if (lowerText.match(/(healthcare|medical|health)/)) return 'Healthcare';
    if (lowerText.match(/(ecommerce|retail|e-commerce)/)) return 'E-commerce';
    if (lowerText.match(/(startup|tech|technology|software)/)) return 'Technology';

    return 'Technology'; // Default
  }

  private static extractRole(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('developer') || lowerText.includes('engineer')) return 'Software Developer';
    if (lowerText.includes('designer')) return 'Designer';
    if (lowerText.includes('manager')) return 'Manager';
    if (lowerText.includes('analyst')) return 'Analyst';

    return 'Professional';
  }

  private static extractResponsibilities(text: string): string[] {
    // Extract bullet points that look like responsibilities
    const lines = text.split('\n');
    const responsibilities: string[] = [];

    for (const line of lines) {
      if (line.match(/^[-*•]\s*/) && line.length > 20) {
        responsibilities.push(line.replace(/^[-*•]\s*/, '').trim());
      }
    }

    return responsibilities.slice(0, 10);
  }

  private static extractQualifications(text: string): string[] {
    const qualificationKeywords = ['degree', 'bachelor', 'master', 'certification', 'experience'];
    const lines = text.split('\n');
    const qualifications: string[] = [];

    for (const line of lines) {
      if (qualificationKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        qualifications.push(line.trim());
      }
    }

    return qualifications.slice(0, 5);
  }

  private static extractResumeKeywords(resume: ParsedResumeContent): KeywordExtraction[] {
    const keywords: KeywordExtraction[] = [];

    // Skills
    resume.skills.forEach(skill => {
      keywords.push({
        keyword: skill,
        frequency: 1,
        importance: 'high',
        category: this.categorizeKeyword(skill),
        context: ['skills section']
      });
    });

    // Experience keywords
    resume.experience.forEach(exp => {
      const expKeywords = this.extractKeywordsFromText(exp.description);
      expKeywords.forEach(keyword => {
        keywords.push({
          keyword,
          frequency: 1,
          importance: 'medium',
          category: this.categorizeKeyword(keyword),
          context: [exp.title, exp.company]
        });
      });
    });

    return keywords;
  }

  private static extractKeywordsFromText(text: string): string[] {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being'
    ]);

    return text
      .toLowerCase()
      .split(/[^\w]+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20);
  }

  private static async matchKeywords(
    env: Env,
    resumeKeywords: KeywordExtraction[],
    jobKeywords: KeywordExtraction[]
  ): Promise<KeywordMatch[]> {
    const matches: KeywordMatch[] = [];

    for (const jobKeyword of jobKeywords) {
      const resumeMatch = resumeKeywords.find(resumeKeyword =>
        resumeKeyword.keyword.toLowerCase().includes(jobKeyword.keyword.toLowerCase()) ||
        jobKeyword.keyword.toLowerCase().includes(resumeKeyword.keyword.toLowerCase())
      );

      matches.push({
        keyword: jobKeyword.keyword,
        resumeCount: resumeMatch ? 1 : 0,
        jobDescriptionCount: 1,
        importance: jobKeyword.importance === 'critical' ? 'high' :
                   jobKeyword.importance === 'high' ? 'medium' : 'low',
        category: jobKeyword.category
      });
    }

    return matches;
  }

  private static calculateMatchScore(
    resume: ParsedResumeContent,
    jobAnalysis: JobDescriptionAnalysis,
    keywordMatches: KeywordMatch[]
  ): MatchScore {
    // Skills matching
    const requiredSkillsMatched = keywordMatches.filter(match =>
      match.importance === 'high' && match.resumeCount > 0
    ).length;
    const totalRequiredSkills = jobAnalysis.requiredSkills.length || 1;
    const skillsScore = (requiredSkillsMatched / totalRequiredSkills) * 100;

    // Experience level matching
    const experienceScore = this.matchExperienceLevel(
      resume.experience.length,
      jobAnalysis.experienceLevel
    );

    // Education matching
    const educationScore = resume.education.length > 0 ? 80 : 60;

    // Keyword density
    const keywordScore = (keywordMatches.filter(m => m.resumeCount > 0).length / keywordMatches.length) * 100;

    // Overall qualifications
    const qualificationsScore = 70; // Simplified

    const breakdown = {
      skills: Math.round(skillsScore),
      experience: experienceScore,
      education: educationScore,
      keywords: Math.round(keywordScore),
      qualifications: qualificationsScore
    };

    const overall = Math.round(
      breakdown.skills * 0.3 +
      breakdown.experience * 0.25 +
      breakdown.keywords * 0.25 +
      breakdown.education * 0.1 +
      breakdown.qualifications * 0.1
    );

    return {
      overall,
      breakdown,
      confidence: overall > 70 ? 0.9 : overall > 50 ? 0.7 : 0.5
    };
  }

  private static matchExperienceLevel(resumeExpYears: number, requiredLevel: string): number {
    const experienceMapping = {
      'Entry': 0,
      'Mid': 3,
      'Senior': 7,
      'Executive': 10
    };

    const required = experienceMapping[requiredLevel as keyof typeof experienceMapping] || 3;
    const actual = resumeExpYears;

    if (actual >= required) return 100;
    if (actual >= required * 0.8) return 80;
    if (actual >= required * 0.6) return 60;
    return 40;
  }

  private static identifyMissingKeywords(
    jobKeywords: KeywordExtraction[],
    resumeKeywords: KeywordExtraction[]
  ): string[] {
    const resumeKeywordSet = new Set(
      resumeKeywords.map(k => k.keyword.toLowerCase())
    );

    return jobKeywords
      .filter(jk => jk.importance !== 'low')
      .filter(jk => !resumeKeywordSet.has(jk.keyword.toLowerCase()))
      .map(jk => jk.keyword)
      .slice(0, 15);
  }

  private static async generateActionableSuggestions(
    env: Env,
    resume: ParsedResumeContent,
    jobAnalysis: JobDescriptionAnalysis,
    matchScore: MatchScore,
    missingKeywords: string[]
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (matchScore.breakdown.skills < 70) {
      suggestions.push(`Add these critical skills: ${missingKeywords.slice(0, 3).join(', ')}`);
    }

    if (matchScore.breakdown.experience < 70) {
      suggestions.push('Highlight more relevant work experience that aligns with job requirements');
    }

    if (matchScore.breakdown.keywords < 60) {
      suggestions.push('Include more industry-specific keywords throughout your resume');
    }

    if (resume.summary === undefined || resume.summary.length < 100) {
      suggestions.push('Add a compelling professional summary that matches the role');
    }

    if (missingKeywords.length > 10) {
      suggestions.push('Consider taking courses or gaining experience in missing skill areas');
    }

    // Use AI to generate additional contextual suggestions
    try {
      const aiSuggestions = await this.generateAISuggestions(env, resume, jobAnalysis, matchScore);
      suggestions.push(...aiSuggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }

    return suggestions.slice(0, 8);
  }

  private static async generateAISuggestions(
    env: Env,
    resume: ParsedResumeContent,
    jobAnalysis: JobDescriptionAnalysis,
    matchScore: MatchScore
  ): Promise<string[]> {
    const prompt = `Based on this resume analysis, provide 3-5 specific, actionable suggestions:

Resume Summary: ${resume.summary || 'No summary provided'}
Skills: ${resume.skills.slice(0, 10).join(', ')}
Experience Count: ${resume.experience.length}

Job Requirements: ${jobAnalysis.requiredSkills.map(s => s.keyword).join(', ')}
Match Score: ${matchScore.overall}%

Provide specific, actionable advice for improving the match score.`;

    try {
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'Provide specific, actionable resume improvement suggestions. Be concise and practical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const suggestions = (response.response || response)
        .split('\n')
        .filter((line: string) => line.trim() && line.match(/^[-*•\d+\.]/))
        .map((line: string) => line.replace(/^[-*•\d+\.]\s*/, '').trim())
        .slice(0, 5);

      return suggestions;

    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return [];
    }
  }
}