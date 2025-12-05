import type { Route } from '../../../index'

export const endMockInterviewSessionRoute: Route<'/api/mock-interview-session/:sessionId/end'> = async (ctx) => {
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

    // Get DurableObject instance
    const durableObjectId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
    const durableMockInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableObjectId)

    // End the session
    const result = await durableMockInterview.endSession(sessionId)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in endMockInterviewSessionRoute:', error)
    return ctx.json({
      error: 'Failed to end session',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
