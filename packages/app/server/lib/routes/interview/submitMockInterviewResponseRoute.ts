import type { Route } from '../../../index'

export const submitMockInterviewResponseRoute: Route<'/api/mock-interview-session/:sessionId/respond'> = async (ctx) => {
  // Get authenticated account
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // Get session ID from route params
    const sessionId = parseInt(ctx.req.param('sessionId'))
    if (isNaN(sessionId)) {
      return ctx.json({ error: 'Invalid session ID' }, 400)
    }

    // Parse request body
    const body = await ctx.req.json<{
      userText: string
      conversationHistory?: Array<{ role: string; content: string }>
    }>()

    if (!body.userText || body.userText.trim().length === 0) {
      return ctx.json({ error: 'User text is required' }, 400)
    }

    // Get base URL from request
    const url = new URL(ctx.req.url)
    const baseUrl = `${url.protocol}//${url.host}`

    // Get R2 public URL - REQUIRED for Replicate to access audio files
    // Priority: 1) Header, 2) Environment variable, 3) Error
    const r2PublicUrl =
      ctx.req.header('X-R2-Public-URL') ||
      ctx.env.R2_PUBLIC_URL ||
      (() => {
        throw new Error(
          'R2_PUBLIC_URL is required. Set it in wrangler.toml [vars] or .dev.vars, or pass X-R2-Public-URL header'
        )
      })()

    // Get DurableObject instance
    const durableObjectId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
    const durableMockInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableObjectId)

    // Submit response and get AI reply
    const result = await durableMockInterview.submitResponse({
      sessionId,
      userText: body.userText,
      conversationHistory: body.conversationHistory,
      baseUrl,
      r2PublicUrl,
    })

    return ctx.json(result)
  } catch (error) {
    console.error('Error in submitMockInterviewResponseRoute:', error)
    return ctx.json({
      error: 'Failed to submit response',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
