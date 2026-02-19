import type { Route } from '../../../index'

export const listSessionsWithFeedbackRoute: Route<'/api/mock-interview-session/performance'> = async (ctx) => {
  // Get authenticated account
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // Get DurableObject instance
    const durableObjectId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
    const durableMockInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableObjectId)

    // Get sessions with feedback scores
    const result = await durableMockInterview.listSessionsWithFeedback(account.accountId)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in listSessionsWithFeedbackRoute:', error)
    return ctx.json({
      error: 'Failed to get sessions with feedback',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
