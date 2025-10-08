import type { Route } from '../../../index'

export const extractKeywordsRoute: Route = async (ctx) => {
  try {
    const { jobDescription } = await ctx.req.json()

    if (!jobDescription || typeof jobDescription !== 'string') {
      return ctx.json({ error: 'Invalid or missing jobDescription' }, 400)
    }

    const prompt = `You are an assistant that extracts the most important keywords and skills from a job description.

Given the following job description, return a JSON object with two properties:
- keywords: an array of 6-12 short keyword phrases (lowercase), prioritized by relevance.
- resumeSuggestion: a short (1-3 sentence) tailored suggestion a candidate could apply to their resume to better match the job.

Only return the JSON object and nothing else.

Job Description:
${jobDescription}
`

    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      temperature: 0.0,
      top_p: 0.5
    })

    if (!aiResponse || !aiResponse.response) {
      throw new Error('No response from AI service')
    }

    // The model is instructed to return JSON only, but be defensive and try to parse.
    let parsed: any = { keywords: [], resumeSuggestion: '' }
    try {
      parsed = JSON.parse(aiResponse.response)
    } catch (err) {
      // If parsing fails, attempt to extract JSON substring
      const m = aiResponse.response.match(/\{[\s\S]*\}/)
      if (m) {
        try { parsed = JSON.parse(m[0]) } catch (_) { /* ignore */ }
      }
    }

    // Normalize keywords to array of strings
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k: any) => String(k).toLowerCase().trim())
      : []

    const resumeSuggestion = typeof parsed.resumeSuggestion === 'string' ? parsed.resumeSuggestion : ''

    return ctx.json({ success: true, keywords, resumeSuggestion, model: '@cf/meta/llama-3.1-8b-instruct' })
  } catch (error) {
    console.error('Error in extractKeywordsRoute:', error)
    return ctx.json({ error: 'Failed to extract keywords', details: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
}
