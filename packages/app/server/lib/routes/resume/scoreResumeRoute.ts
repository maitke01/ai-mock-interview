import type { Route } from '../../../index'

/**
 * AI-powered resume scoring endpoint
 * Uses Llama to generate ATS, readability, and completion scores
 * Scores are stored in the database tied to the resume
 */
export const scoreResumeRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{ resumeId: number; resumeText: string }>()
    const { resumeId, resumeText } = body

    if (!resumeId || !resumeText) {
      return ctx.json({ error: 'Missing resumeId or resumeText' }, 400)
    }

    // Run all three AI scoring calls in parallel
    const [atsScore, readabilityScore, completionScore] = await Promise.all([
      generateAtsScore(ctx.env.AI, resumeText),
      generateReadabilityScore(ctx.env.AI, resumeText),
      generateCompletionScore(ctx.env.AI, resumeText),
    ])

    // Store scores in the database
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    await durableAccount.saveResumeScores(resumeId, {
      atsScore,
      readabilityScore,
      completionScore,
    })

    return ctx.json({
      success: true,
      scores: {
        atsScore,
        readabilityScore,
        completionScore,
      }
    })
  } catch (error) {
    console.error('Error in scoreResumeRoute:', error)
    return ctx.json({
      error: 'Failed to score resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}

/**
 * Generate ATS (Applicant Tracking System) score using Llama
 * Evaluates how well the resume would perform with ATS software
 */
async function generateAtsScore(ai: Ai, resumeText: string): Promise<number> {
  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer evaluating a resume.

Resume text:
"${resumeText.slice(0, 3000)}"

Evaluate this resume for ATS compatibility. Consider:
- Does it use standard section headers (Education, Experience, Skills)?
- Is the formatting clean and parseable (no complex tables/graphics)?
- Does it include relevant keywords and action verbs?
- Is contact information clearly present?
- Are dates and job titles clearly formatted?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the ATS compatibility score. The number must be the last thing in your response.`

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 150,
  })

  return extractScore(response)
}

/**
 * Generate readability score using Llama
 * Evaluates how clear and easy to understand the resume is
 */
async function generateReadabilityScore(ai: Ai, resumeText: string): Promise<number> {
  const prompt = `You are evaluating a resume for READABILITY.

Resume text:
"${resumeText.slice(0, 3000)}"

Evaluate how readable and clear this resume is. Consider:
- Is the language clear and concise?
- Are bullet points well-written and easy to scan?
- Is there appropriate use of professional vocabulary?
- Are sentences an appropriate length (not too wordy)?
- Is the overall structure logical and easy to follow?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the readability score. The number must be the last thing in your response.`

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 150,
  })

  return extractScore(response)
}

/**
 * Generate completion score using Llama
 * Evaluates how complete and comprehensive the resume is
 */
async function generateCompletionScore(ai: Ai, resumeText: string): Promise<number> {
  const prompt = `You are evaluating a resume for COMPLETENESS.

Resume text:
"${resumeText.slice(0, 3000)}"

Evaluate how complete this resume is. Consider:
- Does it have contact information (name, email, phone)?
- Does it include work experience with descriptions?
- Does it list education/qualifications?
- Does it include relevant skills?
- Does it have a professional summary or objective?
- Are job descriptions detailed with accomplishments?

Provide a brief 1-2 sentence evaluation, then end your response with ONLY a number from 0-100 representing the completion score. The number must be the last thing in your response.`

  const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 150,
  })

  return extractScore(response)
}

/**
 * Extract the score (last number) from an AI response
 * Uses the same pattern as interview confidence scoring
 */
function extractScore(response: unknown): number {
  const responseText = typeof response === 'object' && response !== null && 'response' in response
    ? (response as { response: string }).response
    : String(response)

  // Extract the last number from the response
  const numbers = responseText.match(/\d+/g)
  if (numbers && numbers.length > 0) {
    const score = parseInt(numbers[numbers.length - 1], 10)
    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score))
  }

  // Default to 50 if no number found
  return 50
}
