import type { Route } from "../..";
import { ResumeParserService } from "../services/resumeParser";

export const resumeAnalysisRoute: Route = async (ctx) => {
  try {
    const { resumeText, analysisType = 'comprehensive' } = await ctx.req.json();

    if (!resumeText) {
      return Response.json({ error: 'Resume text is required' }, { status: 400 });
    }

    // Parse the resume first
    const parsedResume = ResumeParserService.parseResumeText(resumeText);

    // Create AI prompt based on analysis type
    let prompt = '';

    switch (analysisType) {
      case 'comprehensive':
        prompt = `Analyze this resume comprehensively and provide detailed feedback:

Resume Content: "${resumeText}"

Please provide:

1. **Overall Assessment** (1-10 rating with explanation)
2. **Key Strengths** - What stands out positively
3. **Areas for Improvement** - Specific actionable recommendations
4. **Missing Elements** - What should be added
5. **Format & Structure** - How to improve readability
6. **Keywords & ATS Optimization** - Industry keywords to include
7. **Interview Preparation** - 5 likely questions based on this background
8. **Career Progression** - How this person can advance their career

Format your response clearly with headers and bullet points.`;
        break;

      case 'ats-optimization':
        prompt = `Focus on ATS (Applicant Tracking System) optimization for this resume:

"${resumeText}"

Provide specific recommendations for:
1. Keywords to add for better ATS scanning
2. Format improvements for ATS compatibility
3. Section organization for better parsing
4. Skills section optimization
5. Job title and company formatting`;
        break;

      case 'interview-prep':
        prompt = `Based on this resume, prepare interview coaching:

"${resumeText}"

Provide:
1. 10 most likely interview questions for this background
2. STAR method examples for top experiences
3. Weakness/strength talking points
4. Questions they should ask the interviewer
5. Salary negotiation talking points based on experience level`;
        break;

      case 'career-advice':
        prompt = `Provide career advancement advice based on this resume:

"${resumeText}"

Include:
1. Next logical career steps
2. Skills to develop for advancement
3. Industry trends they should know
4. Networking strategies
5. Professional development recommendations`;
        break;

      default:
        prompt = `Analyze this resume and provide helpful feedback: "${resumeText}"`;
    }

    const response = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are an expert career counselor and resume reviewer with 15+ years of experience helping professionals advance their careers. Provide detailed, actionable, and encouraging feedback.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return Response.json({
      success: true,
      analysis: {
        type: analysisType,
        aiResponse: response.response || response,
        parsedData: parsedResume,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resume analysis error:', error);
    return Response.json({
      error: 'Failed to analyze resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};