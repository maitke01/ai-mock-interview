import type { Route } from "../.."
import { env } from 'cloudflare:workers'

export interface ParsedResume {
  sections: {
    personalInfo: string[];
    summary?: string[];
    experience: string[];
    education: string[];
    skills: string[];
  };
  rawText: string;
}

export class ResumeParserService {
  static async parseResumeText(text: string): Promise<ParsedResume> {
    const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [
        {
          role: 'system',
          content:  `
You are a Resume Analyzer whose job is to extract different fields from a resume.

Given the resume text, extract and return the following fields as JSON:
{
  personalInfo: string[],
  summary: string[],
  education: string[],
  experience: string[],
  skills: string[]
}

❗Return only a **complete, syntactically valid JSON object**. Do not include any Markdown, code blocks, or explanations. Make sure all brackets and quotes are closed. Return all five top-level keys, even if the arrays are empty.

If the content is too long, return a best-effort **partial result** but still ensure the JSON is valid.
`
        },
        {
          role: 'user',
          content: text
        }
      ]
    })

    let sections: unknown

    try {
      const first = response.response.indexOf('```')
      const last  = response.response.lastIndexOf('```')

      console.log(response.response.slice(first + 3, last))
      sections = JSON.parse(response.response.slice(first + 3, last))

      console.log({ sections })
    } catch (e) {
      sections = {}
    }

    return {
      sections: sections as ParsedResume['sections'],
      rawText: text
    };
  }

  private static extractPersonalInfo(text: string) {
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = text.match(/(\+?1?[-.\s]?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}))/);

    return {
      email: emailMatch?.[1],
      phone: phoneMatch?.[1],
    };
  }

  private static extractSummary(lines: string[]): string | undefined {
    const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
    const summaryIndex = lines.findIndex(line =>
      summaryKeywords.some(keyword =>
        line.toLowerCase().includes(keyword) && line.length < 50
      )
    );

    if (summaryIndex !== -1 && summaryIndex + 1 < lines.length) {
      return lines[summaryIndex + 1];
    }
    return undefined;
  }

  private static extractExperience(lines: string[]) {
    const experience: Array<{title: string, company: string, duration: string, description: string}> = [];
    const experienceKeywords = ['experience', 'work', 'employment', 'career'];

    const experienceStartIndex = lines.findIndex(line =>
      experienceKeywords.some(keyword =>
        line.toLowerCase().includes(keyword) && line.length < 50
      )
    );

    if (experienceStartIndex !== -1) {
      for (let i = experienceStartIndex + 1; i < lines.length; i++) {
        const line = lines[i];

        // Stop if we hit another section
        if (this.isSectionHeader(line)) break;

        // Look for job titles and companies
        if (line.length > 10 && line.length < 100) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.length > 10) {
            experience.push({
              title: line.trim(),
              company: nextLine.trim(),
              duration: '',
              description: lines[i + 2] || ''
            });
            i += 2;
          }
        }
      }
    }

    return experience;
  }

  private static extractEducation(lines: string[]) {
    const education: Array<{degree: string, institution: string, year: string}> = [];
    const educationKeywords = ['education', 'academic', 'degree', 'university', 'college'];

    const educationStartIndex = lines.findIndex(line =>
      educationKeywords.some(keyword =>
        line.toLowerCase().includes(keyword) && line.length < 50
      )
    );

    if (educationStartIndex !== -1) {
      for (let i = educationStartIndex + 1; i < lines.length; i++) {
        const line = lines[i];

        if (this.isSectionHeader(line)) break;

        if (line.length > 10 && line.length < 100) {
          const nextLine = lines[i + 1];
          education.push({
            degree: line.trim(),
            institution: nextLine?.trim() || '',
            year: ''
          });
          if (nextLine) i++;
        }
      }
    }

    return education;
  }

  private static extractSkills(lines: string[]): string[] {
    const skills: string[] = [];
    const skillsKeywords = ['skills', 'competencies', 'technologies', 'expertise'];

    const skillsStartIndex = lines.findIndex(line =>
      skillsKeywords.some(keyword =>
        line.toLowerCase().includes(keyword) && line.length < 50
      )
    );

    if (skillsStartIndex !== -1) {
      for (let i = skillsStartIndex + 1; i < lines.length; i++) {
        const line = lines[i];

        if (this.isSectionHeader(line)) break;

        // Split by common separators
        const lineSkills = line.split(/[,|•·\n]/)
          .map(skill => skill.trim())
          .filter(skill => skill.length > 1 && skill.length < 30);

        skills.push(...lineSkills);
      }
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  private static isSectionHeader(line: string): boolean {
    const sectionKeywords = [
      'experience', 'education', 'skills', 'summary', 'objective',
      'projects', 'certifications', 'awards', 'references'
    ];

    return line.length < 50 &&
           sectionKeywords.some(keyword =>
             line.toLowerCase().includes(keyword)
           );
  }
}

export const resumeParserRoute: Route = async (ctx) => {
  try {
    const { resumeText } = await ctx.req.json();

    if (!resumeText) {
      return Response.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const parsedResume = ResumeParserService.parseResumeText(resumeText);

    return Response.json({
      success: true,
      data: parsedResume
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return Response.json({
      error: 'Failed to parse resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};