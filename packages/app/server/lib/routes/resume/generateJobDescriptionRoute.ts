import type { Route } from '../../../index'

export const generateJobDescriptionRoute: Route = async (ctx) => {
  try {
    const { resumeText } = await ctx.req.json()

    if (!resumeText || typeof resumeText !== 'string') {
      return ctx.json({ error: 'Invalid or missing resumeText' }, 400)
    }

    const prompt = `You are a career coach assistant. Based on the following resume text, generate a realistic job description that would be a good match for this candidate's skills and experience.

The job description should:
1. Be realistic and professional
2. Match the candidate's apparent experience level
3. Include relevant skills from the resume
4. Have a job title, company description placeholder, responsibilities, and requirements sections

Format the output as a plain text job description (not JSON). Keep it concise but comprehensive (200-400 words).

Resume:
${resumeText.slice(0, 3000)}
`

    // Try Cloudflare AI binding if available
    const env = (ctx.env as any) || {}
    let aiResponse: any = null
    if (env.AI && typeof env.AI.run === 'function') {
      try {
        aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1024
        })
      } catch (err) {
        console.warn('AI.run failed in generateJobDescriptionRoute', err)
        aiResponse = null
      }
    }

    if (aiResponse && aiResponse.response) {
      return ctx.json({
        success: true,
        jobDescription: aiResponse.response.trim(),
        model: '@cf/meta/llama-3.1-8b-instruct'
      })
    }

    // Fallback: Generate a basic job description from resume keywords
    const text = resumeText.toLowerCase()

    // Extract potential skills/technologies
    const techKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'docker',
      'kubernetes', 'git', 'agile', 'scrum', 'api', 'rest', 'graphql', 'mongodb', 'postgresql',
      'html', 'css', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'c++', 'c#',
      'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'machine learning', 'data analysis',
      'project management', 'leadership', 'communication', 'problem solving'
    ]

    const foundSkills = techKeywords.filter(kw => text.includes(kw))

    // Detect experience level
    let level = 'Mid-Level'
    if (text.includes('senior') || text.includes('lead') || text.includes('manager') || text.includes('director')) {
      level = 'Senior'
    } else if (text.includes('junior') || text.includes('entry') || text.includes('intern') || text.includes('graduate')) {
      level = 'Entry-Level'
    }

    // Detect role type
    let roleType = 'Software Developer'
    if (text.includes('data scientist') || text.includes('machine learning')) {
      roleType = 'Data Scientist'
    } else if (text.includes('devops') || text.includes('infrastructure')) {
      roleType = 'DevOps Engineer'
    } else if (text.includes('frontend') || text.includes('front-end') || text.includes('ui')) {
      roleType = 'Frontend Developer'
    } else if (text.includes('backend') || text.includes('back-end') || text.includes('server')) {
      roleType = 'Backend Developer'
    } else if (text.includes('full stack') || text.includes('fullstack')) {
      roleType = 'Full Stack Developer'
    } else if (text.includes('product manager') || text.includes('product management')) {
      roleType = 'Product Manager'
    } else if (text.includes('project manager') || text.includes('project management')) {
      roleType = 'Project Manager'
    }

    const skillsList = foundSkills.length > 0
      ? foundSkills.slice(0, 8).join(', ')
      : 'relevant technical skills'

    const fallbackDescription = `${level} ${roleType}

Company: [Company Name]
Location: Remote / Hybrid

About the Role:
We are looking for a talented ${level.toLowerCase()} ${roleType.toLowerCase()} to join our growing team. The ideal candidate will have hands-on experience with ${skillsList}.

Responsibilities:
- Design, develop, and maintain high-quality software solutions
- Collaborate with cross-functional teams to define and implement new features
- Write clean, maintainable, and well-documented code
- Participate in code reviews and contribute to team best practices
- Troubleshoot and debug applications to optimize performance

Requirements:
- Proficiency in ${foundSkills.slice(0, 4).join(', ') || 'programming languages relevant to the role'}
- Strong problem-solving and analytical skills
- Excellent communication and teamwork abilities
- Experience with version control systems (Git)
- ${level === 'Senior' ? '5+ years' : level === 'Entry-Level' ? '0-2 years' : '2-5 years'} of relevant experience

Nice to Have:
${foundSkills.slice(4, 7).map(s => `- Experience with ${s}`).join('\n') || '- Additional relevant certifications or experience'}

Benefits:
- Competitive salary and equity
- Health, dental, and vision insurance
- Flexible work arrangements
- Professional development opportunities`

    return ctx.json({
      success: true,
      jobDescription: fallbackDescription,
      model: 'heuristic'
    })
  } catch (error) {
    console.error('Error in generateJobDescriptionRoute:', error)
    return ctx.json({
      error: 'Failed to generate job description',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
