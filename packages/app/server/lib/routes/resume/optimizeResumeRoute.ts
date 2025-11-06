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

    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: prompt,
      // moderately creative (more creative & varied)
      temperature: 0.7,
      // vocabulary diversity
      top_p: 0.9
    })

    if (!aiResponse || !aiResponse.response) {
      throw new Error('No response from AI service')
    }

    return ctx.json({
      success: true,
      optimizedResume: aiResponse.response,
      fileName: fileName,
      originalLength: text.length,
      optimizedLength: aiResponse.response.length,
      model: '@cf/meta/llama-3.1-8b-instruct'
    })
  } catch (error) {
    console.error('Error in optimizeResumeRoute:', error)

    return ctx.json({
      error: 'Failed to optimize resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
