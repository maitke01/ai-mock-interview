import type { Route } from '../../../index'

export const optimizeResumeRoute: Route = async (ctx) => {
  try {
    const { text, metadata, fileName } = await ctx.req.json()

    if (!text || typeof text !== 'string') {
      return ctx.json({ error: 'Invalid or missing text content' }, 400)
    }

    const prompt =
      `You are a professional resume optimization assistant. Your task is to analyze and improve the following resume content using natural language processing techniques.

Please analyze the resume content for:
1. Structure and organization
2. Content clarity and impact
3. Professional formatting suggestions
4. Skills presentation
5. Experience descriptions
6. Achievement quantification
7. ATS (Applicant Tracking System) optimization

Original Resume Content:
${text}

${metadata && Object.keys(metadata).length > 0 ? `Additional Metadata: ${JSON.stringify(metadata, null, 2)}` : ''}

Please provide an improved version of this resume with the following improvements:
- Better structure and organization
- More impactful language and action verbs
- Quantified achievements where possible
- Improved readability and flow
- ATS-friendly formatting suggestions
- Professional tone and clarity

Provide the optimized resume content followed by a detailed summary of the key improvements made.`

    // Ensure AI binding exists
    if (!ctx.env || !(ctx as any).env || !(ctx.env as any).AI) {
      console.error('AI binding not available in environment')
      return ctx.json({ error: 'AI service not available in server environment' }, 501)
    }

    let aiResponse: any
    try {
      aiResponse = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: prompt,
        // moderately creative (more creative & varied)
        temperature: 0.7,
        // vocabulary diversity
        top_p: 0.9
      })
    } catch (aiError) {
      console.error('AI.run failed:', aiError)
      return ctx.json({ error: 'AI service error', details: aiError instanceof Error ? aiError.message : String(aiError) }, 502)
    }

    if (!aiResponse || !aiResponse.response) {
      console.error('AI returned no response', aiResponse)
      return ctx.json({ error: 'No response from AI service', details: aiResponse }, 502)
    }

    // Compute a simple readability score to return with the optimized resume
    // (same approach as readabilityRoute)
    const resumeText = String(aiResponse.response).trim()
    const sentences = resumeText.split(/[.!?]+/).filter(Boolean)
    const words = resumeText.split(/\s+/).filter(Boolean)

    function countSyllables(word: string): number {
      word = word.toLowerCase()
      if (word.length <= 3) return 1
      const matches = word.match(/[aeiouy]{1,2}/g)
      return matches ? matches.length : 1
    }

    const totalWords = words.length
    const totalSentences = sentences.length
    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)

    const fleschScore = totalSentences > 0 && totalWords > 0
      ? 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
      : 0

    const normalizedScore = Math.max(0, Math.min(100, Math.round(fleschScore)))

    return ctx.json({
      success: true,
      optimizedResume: aiResponse.response,
      fileName: fileName,
      originalLength: text.length,
      optimizedLength: aiResponse.response.length,
      model: '@cf/meta/llama-3.1-8b-instruct',
      readabilityScore: normalizedScore,
      score: normalizedScore
    })
  } catch (error) {
    console.error('Error in optimizeResumeRoute:', error)

    return ctx.json({
      error: 'Failed to optimize resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
