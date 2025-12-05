import type { Route } from '../../../index'

export const startMockInterviewSessionRoute: Route = async (ctx) => {
  // Get authenticated account
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // Parse request body
    const body = await ctx.req.json<{ mockInterviewId?: number }>()

    // Get DurableObject instance (one per user)
    // Use a deterministic ID based on accountId
    const durableObjectId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
    const durableMockInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableObjectId)

    // Start a new session
    const result = await durableMockInterview.startSession({
      accountId: account.accountId,
      mockInterviewId: body.mockInterviewId,
    })

    return ctx.json(result)
  } catch (error) {
    console.error('Error in startMockInterviewSessionRoute:', error)
    return ctx.json({
      error: 'Failed to start mock interview session',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
