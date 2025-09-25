import type { ResumeTemplate, ParsedResumeContent, TemplateSection } from '../models/resumeModels';

export interface TemplateRecommendation {
  template: ResumeTemplate;
  matchScore: number;
  reasoning: string[];
  customizations: TemplateCustomization[];
}

export interface TemplateCustomization {
  section: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

export interface GeneratedTemplate {
  id: string;
  name: string;
  content: string;
  sections: GeneratedSection[];
  formatting: {
    layout: string;
    colorScheme: string;
    typography: string;
  };
  metadata: {
    industry: string;
    role: string;
    experienceLevel: string;
    atsOptimized: boolean;
  };
}

export interface GeneratedSection {
  name: string;
  content: string;
  order: number;
  required: boolean;
  guidelines: string[];
}

export class TemplateService {

  private static readonly TEMPLATE_DATABASE: ResumeTemplate[] = [
    {
      id: 'tech-senior',
      name: 'Senior Technology Professional',
      category: 'Technology',
      industry: ['Technology', 'Software', 'Engineering'],
      experienceLevel: ['Senior', 'Executive'],
      description: 'Optimized for senior technology roles with emphasis on leadership and technical achievements',
      sections: [
        { name: 'Contact Information', required: true, order: 1, guidelines: ['Keep it simple and professional', 'Include LinkedIn and GitHub'] },
        { name: 'Professional Summary', required: true, order: 2, guidelines: ['3-4 lines highlighting leadership and technical expertise', 'Include years of experience'] },
        { name: 'Technical Skills', required: true, order: 3, guidelines: ['Categorize by type (Languages, Frameworks, Tools)', 'List most relevant first'] },
        { name: 'Professional Experience', required: true, order: 4, guidelines: ['Start with most recent role', 'Focus on impact and leadership', 'Quantify achievements'] },
        { name: 'Education', required: true, order: 5, guidelines: ['Include degree and graduation year', 'Add relevant coursework if recent graduate'] },
        { name: 'Projects', required: false, order: 6, guidelines: ['Showcase significant technical projects', 'Include technologies used'] },
        { name: 'Certifications', required: false, order: 7, guidelines: ['List current and relevant certifications', 'Include expiration dates'] }
      ],
      formatting: {
        font: 'Calibri',
        fontSize: 11,
        margins: '0.75in',
        lineSpacing: 1.15,
        sectionSpacing: 12,
        bulletStyle: '•'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'tech-entry',
      name: 'Entry Level Technology',
      category: 'Technology',
      industry: ['Technology', 'Software', 'Engineering'],
      experienceLevel: ['Entry'],
      description: 'Perfect for recent graduates and career changers entering technology',
      sections: [
        { name: 'Contact Information', required: true, order: 1, guidelines: ['Professional email and phone', 'Include portfolio/GitHub links'] },
        { name: 'Professional Summary', required: true, order: 2, guidelines: ['2-3 lines focusing on skills and motivation', 'Highlight education and projects'] },
        { name: 'Education', required: true, order: 3, guidelines: ['Include GPA if 3.5 or higher', 'List relevant coursework and projects'] },
        { name: 'Technical Skills', required: true, order: 4, guidelines: ['Group by proficiency level', 'Include tools learned in school'] },
        { name: 'Projects', required: true, order: 5, guidelines: ['Academic and personal projects', 'Emphasize problem-solving'] },
        { name: 'Experience', required: true, order: 6, guidelines: ['Include internships, part-time work', 'Focus on transferable skills'] },
        { name: 'Certifications', required: false, order: 7, guidelines: ['Online courses and certifications', 'Industry-relevant credentials'] }
      ],
      formatting: {
        font: 'Arial',
        fontSize: 11,
        margins: '1in',
        lineSpacing: 1.0,
        sectionSpacing: 10,
        bulletStyle: '•'
      },
      createdAt: new Date().toISOString()
    },
    {
      id: 'marketing-mid',
      name: 'Marketing Professional',
      category: 'Marketing',
      industry: ['Marketing', 'Advertising', 'Digital Marketing'],
      experienceLevel: ['Mid', 'Senior'],
      description: 'Designed for marketing professionals with focus on campaigns and metrics',
      sections: [
        { name: 'Contact Information', required: true, order: 1, guidelines: ['Include professional social media links', 'Portfolio or website link'] },
        { name: 'Brand Statement', required: true, order: 2, guidelines: ['Creative and engaging summary', 'Highlight unique value proposition'] },
        { name: 'Core Competencies', required: true, order: 3, guidelines: ['Marketing channels and tools', 'Analytics and measurement skills'] },
        { name: 'Professional Experience', required: true, order: 4, guidelines: ['Quantify campaign results', 'Show ROI and growth metrics'] },
        { name: 'Education', required: true, order: 5, guidelines: ['Marketing-related degrees', 'Continuing education'] },
        { name: 'Achievements', required: false, order: 6, guidelines: ['Awards and recognition', 'Notable campaign successes'] },
        { name: 'Additional Information', required: false, order: 7, guidelines: ['Languages, volunteer work', 'Industry associations'] }
      ],
      formatting: {
        font: 'Helvetica',
        fontSize: 10.5,
        margins: '0.8in',
        lineSpacing: 1.1,
        sectionSpacing: 14,
        bulletStyle: '▪'
      },
      createdAt: new Date().toISOString()
    }
  ];

  static async suggestTemplates(
    env: Env,
    resumeContent: ParsedResumeContent,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<TemplateRecommendation[]> {
    try {
      const recommendations: TemplateRecommendation[] = [];

      // Analyze resume to determine best templates
      const resumeAnalysis = await this.analyzeResumeForTemplate(env, resumeContent, targetRole, targetIndustry);

      for (const template of this.TEMPLATE_DATABASE) {
        const matchScore = this.calculateTemplateMatch(template, resumeAnalysis);

        if (matchScore > 30) { // Only suggest templates with reasonable matches
          const reasoning = this.generateRecommendationReasoning(template, resumeAnalysis, matchScore);
          const customizations = await this.generateCustomizations(env, template, resumeContent);

          recommendations.push({
            template,
            matchScore,
            reasoning,
            customizations
          });
        }
      }

      // Sort by match score
      return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    } catch (error) {
      console.error('Error suggesting templates:', error);
      return [];
    }
  }

  static async generateCustomTemplate(
    env: Env,
    resumeContent: ParsedResumeContent,
    requirements: {
      role: string;
      industry: string;
      experienceLevel: string;
      preferences?: {
        colorScheme?: string;
        layout?: string;
        emphasis?: string[];
      };
    }
  ): Promise<GeneratedTemplate> {
    try {
      const { role, industry, experienceLevel, preferences = {} } = requirements;

      // Generate template using AI
      const prompt = `Create a custom resume template for:
        Role: ${role}
        Industry: ${industry}
        Experience Level: ${experienceLevel}

        Current resume has:
        - ${resumeContent.experience.length} work experiences
        - Skills: ${resumeContent.skills.slice(0, 10).join(', ')}
        - Education: ${resumeContent.education.length} entries

        Generate a template with:
        1. Optimal section order
        2. Section guidelines
        3. Formatting recommendations
        4. Industry-specific customizations`;

      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume template designer. Create industry-specific templates optimized for ATS and human reviewers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return this.parseGeneratedTemplate(aiResponse.response || aiResponse, requirements);

    } catch (error) {
      console.error('Error generating custom template:', error);

      // Return a fallback template
      return this.createFallbackTemplate(requirements);
    }
  }

  private static async analyzeResumeForTemplate(
    env: Env,
    resumeContent: ParsedResumeContent,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<{
    inferredRole: string;
    inferredIndustry: string;
    experienceLevel: string;
    strengths: string[];
    focusAreas: string[];
  }> {
    try {
      const prompt = `Analyze this resume content to determine the best template approach:

        Experience: ${resumeContent.experience.map(exp => `${exp.title} at ${exp.company}`).join(', ')}
        Skills: ${resumeContent.skills.join(', ')}
        Education: ${resumeContent.education.map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}

        Target Role: ${targetRole || 'Not specified'}
        Target Industry: ${targetIndustry || 'Not specified'}

        Determine:
        1. Most likely role/career focus
        2. Industry alignment
        3. Experience level (Entry/Mid/Senior/Executive)
        4. Key strengths to highlight
        5. Areas that need emphasis`;

      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'Analyze resumes to determine optimal template selection. Be specific and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return this.parseResumeAnalysis(aiResponse.response || aiResponse, resumeContent);

    } catch (error) {
      console.error('Error analyzing resume for template:', error);
      return this.createFallbackAnalysis(resumeContent);
    }
  }

  private static calculateTemplateMatch(
    template: ResumeTemplate,
    analysis: {
      inferredRole: string;
      inferredIndustry: string;
      experienceLevel: string;
      strengths: string[];
      focusAreas: string[];
    }
  ): number {
    let score = 0;

    // Industry match
    if (template.industry.some(industry =>
      industry.toLowerCase().includes(analysis.inferredIndustry.toLowerCase()) ||
      analysis.inferredIndustry.toLowerCase().includes(industry.toLowerCase())
    )) {
      score += 40;
    }

    // Experience level match
    if (template.experienceLevel.includes(analysis.experienceLevel)) {
      score += 30;
    }

    // Role alignment (basic keyword matching)
    const templateName = template.name.toLowerCase();
    const roleKeywords = analysis.inferredRole.toLowerCase().split(' ');
    if (roleKeywords.some(keyword => templateName.includes(keyword))) {
      score += 20;
    }

    // Template completeness for user's content
    score += Math.min(10, template.sections.length * 2);

    return Math.min(100, score);
  }

  private static generateRecommendationReasoning(
    template: ResumeTemplate,
    analysis: { inferredRole: string; inferredIndustry: string; experienceLevel: string },
    matchScore: number
  ): string[] {
    const reasoning: string[] = [];

    if (matchScore > 80) {
      reasoning.push('Excellent match for your background and target role');
    } else if (matchScore > 60) {
      reasoning.push('Good alignment with your experience level and industry');
    } else {
      reasoning.push('Suitable template with some customization needed');
    }

    if (template.industry.includes(analysis.inferredIndustry)) {
      reasoning.push(`Optimized for ${analysis.inferredIndustry} industry standards`);
    }

    if (template.experienceLevel.includes(analysis.experienceLevel)) {
      reasoning.push(`Designed for ${analysis.experienceLevel}-level professionals`);
    }

    reasoning.push(`Includes ${template.sections.length} key sections for comprehensive presentation`);

    return reasoning;
  }

  private static async generateCustomizations(
    env: Env,
    template: ResumeTemplate,
    resumeContent: ParsedResumeContent
  ): Promise<TemplateCustomization[]> {
    const customizations: TemplateCustomization[] = [];

    // Analyze what customizations are needed
    if (!resumeContent.summary) {
      customizations.push({
        section: 'Professional Summary',
        suggestion: 'Add a compelling professional summary to introduce your background',
        priority: 'high',
        example: 'Experienced software engineer with 5+ years developing scalable web applications...'
      });
    }

    if (resumeContent.skills.length < 5) {
      customizations.push({
        section: 'Skills',
        suggestion: 'Expand your skills section with more relevant technical and soft skills',
        priority: 'medium',
        example: 'Include programming languages, frameworks, and tools you\'ve used'
      });
    }

    if (resumeContent.experience.some(exp => !exp.description || exp.description.length < 50)) {
      customizations.push({
        section: 'Experience',
        suggestion: 'Expand job descriptions with specific achievements and quantified results',
        priority: 'high',
        example: 'Instead of "Developed websites" try "Built 5 responsive e-commerce sites increasing conversion by 20%"'
      });
    }

    if (!resumeContent.projects || resumeContent.projects.length === 0) {
      customizations.push({
        section: 'Projects',
        suggestion: 'Add a projects section to showcase your technical abilities',
        priority: 'medium',
        example: 'Include personal, academic, or professional projects that demonstrate your skills'
      });
    }

    return customizations.slice(0, 5);
  }

  private static parseResumeAnalysis(aiResponse: string, resumeContent: ParsedResumeContent): {
    inferredRole: string;
    inferredIndustry: string;
    experienceLevel: string;
    strengths: string[];
    focusAreas: string[];
  } {
    // Parse AI response or use fallback logic
    const hasExperience = resumeContent.experience.length;
    const hasTechSkills = resumeContent.skills.some(skill =>
      ['javascript', 'python', 'java', 'react', 'sql'].some(tech =>
        skill.toLowerCase().includes(tech)
      )
    );

    return {
      inferredRole: hasTechSkills ? 'Software Developer' : 'Professional',
      inferredIndustry: hasTechSkills ? 'Technology' : 'General',
      experienceLevel: hasExperience > 5 ? 'Senior' : hasExperience > 2 ? 'Mid' : 'Entry',
      strengths: resumeContent.skills.slice(0, 5),
      focusAreas: ['experience', 'skills']
    };
  }

  private static createFallbackAnalysis(resumeContent: ParsedResumeContent) {
    return {
      inferredRole: 'Professional',
      inferredIndustry: 'Technology',
      experienceLevel: resumeContent.experience.length > 3 ? 'Mid' : 'Entry',
      strengths: resumeContent.skills.slice(0, 3),
      focusAreas: ['skills', 'experience']
    };
  }

  private static parseGeneratedTemplate(aiResponse: string, requirements: any): GeneratedTemplate {
    // Parse AI response to create template
    // This is a simplified implementation

    const sections: GeneratedSection[] = [
      {
        name: 'Contact Information',
        content: 'Name, phone, email, location, LinkedIn',
        order: 1,
        required: true,
        guidelines: ['Keep professional', 'Include relevant links']
      },
      {
        name: 'Professional Summary',
        content: '3-4 line summary highlighting key qualifications',
        order: 2,
        required: true,
        guidelines: ['Match job requirements', 'Quantify experience']
      },
      {
        name: 'Experience',
        content: 'Work history with achievements and impact',
        order: 3,
        required: true,
        guidelines: ['Use action verbs', 'Quantify results', 'Show progression']
      }
    ];

    return {
      id: crypto.randomUUID(),
      name: `Custom ${requirements.role} Template`,
      content: `Customized template for ${requirements.role} in ${requirements.industry}`,
      sections,
      formatting: {
        layout: 'professional',
        colorScheme: 'classic',
        typography: 'modern'
      },
      metadata: {
        industry: requirements.industry,
        role: requirements.role,
        experienceLevel: requirements.experienceLevel,
        atsOptimized: true
      }
    };
  }

  private static createFallbackTemplate(requirements: any): GeneratedTemplate {
    return {
      id: crypto.randomUUID(),
      name: 'Professional Template',
      content: 'Standard professional resume template',
      sections: [
        {
          name: 'Contact',
          content: 'Contact information',
          order: 1,
          required: true,
          guidelines: ['Professional email', 'Phone number', 'LinkedIn profile']
        }
      ],
      formatting: {
        layout: 'standard',
        colorScheme: 'minimal',
        typography: 'classic'
      },
      metadata: {
        industry: requirements.industry || 'General',
        role: requirements.role || 'Professional',
        experienceLevel: requirements.experienceLevel || 'Mid',
        atsOptimized: true
      }
    };
  }

  static async optimizeTemplateForATS(template: ResumeTemplate): Promise<{
    optimizedTemplate: ResumeTemplate;
    changes: string[];
    atsScore: number;
  }> {
    const changes: string[] = [];
    const optimizedSections = [...template.sections];

    // Ensure standard section names
    const standardSections = ['Contact Information', 'Professional Summary', 'Experience', 'Education', 'Skills'];
    standardSections.forEach(section => {
      if (!optimizedSections.find(s => s.name === section)) {
        optimizedSections.push({
          name: section,
          required: true,
          order: optimizedSections.length + 1,
          guidelines: [`Standard ${section.toLowerCase()} section for ATS compatibility`]
        });
        changes.push(`Added standard ${section} section`);
      }
    });

    // ATS-friendly formatting
    const optimizedFormatting = {
      ...template.formatting,
      font: 'Arial', // ATS-friendly font
      fontSize: 11,
      bulletStyle: '•'
    };

    if (template.formatting.font !== 'Arial') {
      changes.push('Changed to ATS-friendly Arial font');
    }

    const optimizedTemplate: ResumeTemplate = {
      ...template,
      sections: optimizedSections,
      formatting: optimizedFormatting
    };

    const atsScore = this.calculateATSScore(optimizedTemplate);

    return {
      optimizedTemplate,
      changes,
      atsScore
    };
  }

  private static calculateATSScore(template: ResumeTemplate): number {
    let score = 0;

    // Standard sections
    const requiredSections = ['Contact Information', 'Experience', 'Education', 'Skills'];
    const hasAllRequired = requiredSections.every(section =>
      template.sections.find(s => s.name === section)
    );
    score += hasAllRequired ? 30 : 0;

    // ATS-friendly formatting
    if (template.formatting.font === 'Arial') score += 20;
    if (template.formatting.fontSize >= 10 && template.formatting.fontSize <= 12) score += 15;
    if (template.formatting.bulletStyle === '•') score += 10;

    // Structure
    if (template.sections.length >= 4 && template.sections.length <= 8) score += 15;

    // Additional optimizations
    score += 10; // Base score for being organized

    return Math.min(100, score);
  }
}