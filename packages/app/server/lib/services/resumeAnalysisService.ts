import type {
  ResumeAnalysis,
  AnalysisType,
  AnalysisFeedback,
  ParsedResumeContent,
  ATSCompatibility,
  ContentAnalysis,
  FormattingAnalysis
} from '../models/resumeModels';

export class ResumeAnalysisService {

  static async analyzeResume(
    env: Env,
    resumeContent: string,
    parsedContent: ParsedResumeContent,
    analysisType: AnalysisType = 'comprehensive'
  ): Promise<ResumeAnalysis> {

    const analysis = await this.performAIAnalysis(env, resumeContent, parsedContent, analysisType);
    const score = this.calculateOverallScore(analysis);

    return {
      id: crypto.randomUUID(),
      resumeId: '',
      analysisType,
      score,
      feedback: analysis,
      suggestions: this.generateSuggestions(analysis),
      missingKeywords: this.identifyMissingKeywords(parsedContent),
      createdAt: new Date().toISOString(),
      version: 1
    };
  }

  private static async performAIAnalysis(
    env: Env,
    content: string,
    parsed: ParsedResumeContent,
    type: AnalysisType
  ): Promise<AnalysisFeedback> {

    const prompt = this.buildAnalysisPrompt(content, parsed, type);

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `You are an expert resume analyst with 15+ years of experience in recruitment and career development.
                   Analyze resumes with precision and provide actionable feedback. Always respond with structured JSON data.`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return this.parseAIResponse(response.response!, parsed);
  }

  private static buildAnalysisPrompt(content: string, parsed: ParsedResumeContent, type: AnalysisType): string {
    const baseInfo = `
Resume Content: "${content}"

Parsed Sections:
- Personal Info: ${JSON.stringify(parsed.personalInfo)}
- Experience: ${parsed.experience.length} positions
- Education: ${parsed.education.length} entries
- Skills: ${parsed.skills.join(', ')}
- Projects: ${parsed.projects?.length || 0} projects
`;

    switch (type) {
      case 'comprehensive':
        return `${baseInfo}

Provide a comprehensive analysis with scores (1-10) for:

1. **Overall Assessment**: Rate the resume's effectiveness
2. **ATS Compatibility**: How well it works with applicant tracking systems
3. **Content Quality**: Clarity, impact, relevance of content
4. **Formatting**: Structure, consistency, readability
5. **Keyword Optimization**: Industry-relevant keywords present
6. **Achievement Quantification**: Use of numbers and measurable results
7. **Action Verb Usage**: Strong, varied action verbs

For each category, provide:
- Score (1-10)
- 2-3 specific strengths
- 2-3 specific areas for improvement
- Actionable recommendations

Also identify:
- Top 5 missing keywords for this field
- 3 formatting improvements
- 5 content enhancement suggestions`;

      case 'ats-optimization':
        return `${baseInfo}

Focus specifically on ATS (Applicant Tracking System) optimization:

1. **File Format Issues**: Identify format problems
2. **Keyword Analysis**: Missing industry keywords
3. **Section Structure**: ATS-friendly organization
4. **Font and Formatting**: ATS compatibility issues
5. **Contact Information**: Proper formatting for parsing
6. **Skills Section**: Optimization for keyword matching
7. **Job Title Formatting**: Industry-standard formatting

Provide specific recommendations for each area.`;

      case 'gap-detection':
        return `${baseInfo}

Identify gaps and inconsistencies:

1. **Employment Gaps**: Timeline inconsistencies
2. **Skill Gaps**: Missing skills for target roles
3. **Experience Gaps**: Lacking relevant experience types
4. **Education Gaps**: Missing certifications or training
5. **Achievement Gaps**: Lack of quantified results
6. **Industry Knowledge Gaps**: Missing industry-specific terms
7. **Formatting Inconsistencies**: Style and structure issues

For each gap, suggest specific ways to address it.`;

      case 'industry-specific':
        return `${baseInfo}

Analyze against industry-specific standards:

1. **Industry Alignment**: How well does this match industry expectations?
2. **Technical Skills**: Relevant technical competencies
3. **Industry Keywords**: Sector-specific terminology
4. **Experience Relevance**: Industry-appropriate experience
5. **Certifications**: Industry-standard certifications
6. **Trends Awareness**: Current industry trends reflected
7. **Network Indicators**: Professional associations, conferences

Provide industry-specific improvement recommendations.`;

      default:
        return `${baseInfo}

Analyze this resume and provide structured feedback on strengths, weaknesses, and improvement opportunities.`;
    }
  }

  private static parseAIResponse(aiResponse: string, parsed: ParsedResumeContent): AnalysisFeedback {
    // Parse AI response and structure it
    const lines = aiResponse.split('\n').filter(line => line.trim());

    return {
      overallScore: this.extractScore(aiResponse, 'overall') || 7,
      strengths: this.extractListItems(aiResponse, ['strength', 'positive', 'good']),
      weaknesses: this.extractListItems(aiResponse, ['weakness', 'improvement', 'issue']),
      atsCompatibility: this.analyzeATSCompatibility(parsed, aiResponse),
      contentAnalysis: this.analyzeContent(parsed, aiResponse),
      formattingAnalysis: this.analyzeFormatting(parsed, aiResponse)
    };
  }

  private static extractScore(text: string, category: string): number {
    const regex = new RegExp(`${category}[^\\d]*(\\d+(?:\\.\\d+)?)[/\\s]*(?:10|out\\s+of\\s+10)?`, 'i');
    const match = text.match(regex);
    return match ? Math.min(10, Math.max(1, parseFloat(match[1]))) : 7;
  }

  private static extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        // Look for bullet points or numbered items in the next few lines
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.match(/^[-*•\d+\.]\s+/) || nextLine.startsWith('- ')) {
            items.push(nextLine.replace(/^[-*•\d+\.]\s*/, '').trim());
          }
        }
      }
    }

    return items.slice(0, 5); // Limit to 5 items
  }

  private static analyzeATSCompatibility(parsed: ParsedResumeContent, aiResponse: string): ATSCompatibility {
    const score = this.extractScore(aiResponse, 'ats') ||
                  this.extractScore(aiResponse, 'compatibility') || 7;

    const keywordDensity = this.calculateKeywordDensity(parsed);

    return {
      score,
      issues: this.identifyATSIssues(parsed),
      suggestions: this.getATSSuggestions(parsed),
      keywordDensity
    };
  }

  private static analyzeContent(parsed: ParsedResumeContent, aiResponse: string): ContentAnalysis {
    return {
      clarity: this.extractScore(aiResponse, 'clarity') || this.assessClarity(parsed),
      impact: this.extractScore(aiResponse, 'impact') || this.assessImpact(parsed),
      relevance: this.extractScore(aiResponse, 'relevance') || this.assessRelevance(parsed),
      quantifiability: this.assessQuantifiability(parsed),
      actionVerbUsage: this.assessActionVerbs(parsed)
    };
  }

  private static analyzeFormatting(parsed: ParsedResumeContent, aiResponse: string): FormattingAnalysis {
    return {
      consistency: this.extractScore(aiResponse, 'consistency') || this.assessConsistency(parsed),
      readability: this.extractScore(aiResponse, 'readability') || this.assessReadability(parsed),
      structure: this.extractScore(aiResponse, 'structure') || this.assessStructure(parsed),
      length: this.assessLength(parsed)
    };
  }

  private static calculateKeywordDensity(parsed: ParsedResumeContent): number {
    const totalWords = this.countWords(parsed);
    const keywordCount = parsed.skills.length +
      parsed.experience.flatMap(exp => exp.keywords || []).length;

    return totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
  }

  private static countWords(parsed: ParsedResumeContent): number {
    return 0
  }

  private static identifyATSIssues(parsed: ParsedResumeContent): string[] {
    const issues: string[] = [];

    if (!parsed.personalInfo.email) issues.push('Missing email address');
    if (!parsed.personalInfo.phone) issues.push('Missing phone number');
    if (parsed.skills.length < 5) issues.push('Too few skills listed');
    if (!parsed.summary) issues.push('Missing professional summary');

    return issues;
  }

  private static getATSSuggestions(parsed: ParsedResumeContent): string[] {
    const suggestions: string[] = [];

    suggestions.push('Use standard section headers (Experience, Education, Skills)');
    suggestions.push('Include 8-12 relevant keywords throughout the resume');
    suggestions.push('Use simple, clean formatting without tables or graphics');
    suggestions.push('Save as both PDF and plain text versions');

    return suggestions;
  }

  private static assessClarity(parsed: ParsedResumeContent): number {
    let score = 5;

    if (parsed.summary && parsed.summary.length > 50) score += 1;
    if (parsed.experience.every(exp => exp.description.length > 30)) score += 1;
    if (parsed.personalInfo.email && parsed.personalInfo.phone) score += 1;

    return Math.min(10, score);
  }

  private static assessImpact(parsed: ParsedResumeContent): number {
    let score = 5;
    const hasNumbers = parsed.experience.some(exp => /\d+/.test(exp.description));
    const hasAchievements = parsed.experience.some(exp => exp.achievements && exp.achievements.length > 0);

    if (hasNumbers) score += 2;
    if (hasAchievements) score += 2;
    if (parsed.achievements && parsed.achievements.length > 0) score += 1;

    return Math.min(10, score);
  }

  private static assessRelevance(parsed: ParsedResumeContent): number {
    let score = 6;

    if (parsed.skills.length > 5) score += 1;
    if (parsed.experience.length > 1) score += 1;
    if (parsed.projects && parsed.projects.length > 0) score += 1;
    if (parsed.certifications && parsed.certifications.length > 0) score += 1;

    return Math.min(10, score);
  }

  private static assessQuantifiability(parsed: ParsedResumeContent): number {
    const totalExperiences = parsed.experience.length;
    const quantifiedExperiences = parsed.experience.filter(exp =>
      /\d+%|\d+\+|\$\d+|\d+ (million|thousand|hundred)|\d+ (years|months)/.test(exp.description)
    ).length;

    return totalExperiences > 0 ? Math.round((quantifiedExperiences / totalExperiences) * 10) : 0;
  }

  private static assessActionVerbs(parsed: ParsedResumeContent): number {
    const strongVerbs = [
      'achieved', 'improved', 'increased', 'reduced', 'generated', 'created',
      'developed', 'implemented', 'managed', 'led', 'optimized', 'streamlined'
    ];

    const totalExperiences = parsed.experience.length;
    const verbScore = parsed.experience.length

    return totalExperiences > 0 ? Math.round((verbScore / totalExperiences) * 10) : 5;
  }

  private static assessConsistency(parsed: ParsedResumeContent): number {
    // Check for consistent date formats, formatting, etc.
    return 7; // Simplified assessment
  }

  private static assessReadability(parsed: ParsedResumeContent): number {
    // Assess sentence length, complexity, etc.
    return 7; // Simplified assessment
  }

  private static assessStructure(parsed: ParsedResumeContent): number {
    let score = 5;

    if (parsed.personalInfo.name) score += 1;
    if (parsed.summary) score += 1;
    if (parsed.experience.length > 0) score += 1;
    if (parsed.education.length > 0) score += 1;
    if (parsed.skills.length > 0) score += 1;

    return Math.min(10, score);
  }

  private static assessLength(parsed: ParsedResumeContent): number {
    const wordCount = this.countWords(parsed);

    if (wordCount >= 200 && wordCount <= 800) return 10;
    if (wordCount >= 150 && wordCount <= 1000) return 8;
    if (wordCount >= 100 && wordCount <= 1200) return 6;
    return 4;
  }

  private static calculateOverallScore(feedback: AnalysisFeedback): number {
    const weights = {
      overall: 0.3,
      ats: 0.2,
      content: 0.25,
      formatting: 0.15,
      clarity: 0.1
    };

    const contentAvg = (feedback.contentAnalysis.clarity +
                       feedback.contentAnalysis.impact +
                       feedback.contentAnalysis.relevance) / 3;

    const formattingAvg = (feedback.formattingAnalysis.consistency +
                          feedback.formattingAnalysis.readability +
                          feedback.formattingAnalysis.structure) / 3;

    return Math.round(
      feedback.overallScore * weights.overall +
      feedback.atsCompatibility.score * weights.ats +
      contentAvg * weights.content +
      formattingAvg * weights.formatting +
      feedback.contentAnalysis.clarity * weights.clarity
    );
  }

  private static generateSuggestions(feedback: AnalysisFeedback): string[] {
    const suggestions: string[] = [];

    // Add suggestions based on analysis
    if (feedback.atsCompatibility.score < 7) {
      suggestions.push(...feedback.atsCompatibility.suggestions);
    }

    if (feedback.contentAnalysis.quantifiability < 7) {
      suggestions.push('Add more quantified achievements and metrics to your experience');
    }

    if (feedback.contentAnalysis.actionVerbUsage < 7) {
      suggestions.push('Use stronger action verbs to begin your bullet points');
    }

    suggestions.push(...feedback.weaknesses.map(weakness =>
      `Address: ${weakness}`
    ));

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  private static identifyMissingKeywords(parsed: ParsedResumeContent): string[] {
    // This would typically use industry-specific keyword databases
    // For now, return common missing keywords based on content analysis
    const commonKeywords = [
      'leadership', 'teamwork', 'communication', 'problem-solving',
      'project management', 'data analysis', 'customer service'
    ];

    const existingKeywords: string[] = [

    ];

    return commonKeywords.filter(keyword =>
      !existingKeywords.some(existing => existing.includes(keyword))
    );
  }
}