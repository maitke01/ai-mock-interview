import type { Route } from '../../../index'

export const formatResumeRoute: Route = async (ctx) => {
  try {
    const { sectionType, content } = await ctx.req.json()

    if (!sectionType || !content) {
      return ctx.json({ error: 'Missing sectionType or content' }, 400)
    }

    let prompt = ''

    switch (sectionType) {
      case 'header':
        prompt = `Format this resume header. Return ONLY the final formatted text. No explanations, no choices, no "or" options:

${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}`
        break

      case 'sidebar':
        prompt = `Format this resume sidebar. Return ONLY the final formatted text. No explanations:

${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}`
        break

      case 'mainContent':
        prompt = `Format this resume main content. Return ONLY the final formatted text. No explanations:

${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}`
        break

      default:
        prompt = `Format this resume ${sectionType}. Return ONLY the final formatted text:

${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}`
    }

    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: prompt,
      temperature: 0.1,
      top_p: 0.7,
      max_tokens: 512
    })

    if (!aiResponse || !('response' in aiResponse) || !aiResponse.response) {
      throw new Error('No response from AI service')
    }

    let cleanedResponse = aiResponse.response.trim()

    return ctx.json({
      success: true,
      formattedContent: cleanedResponse,
      sectionType: sectionType,
      originalLength: typeof content === 'string' ? content.length : JSON.stringify(content).length,
      formattedLength: cleanedResponse.length,
      model: '@cf/meta/llama-3.1-8b-instruct'
    })
  } catch (error) {
    console.error('Error in formatResumeRoute:', error)

    return ctx.json({
      error: 'Failed to format resume section',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}