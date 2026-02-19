import type { Route } from '../../../index'

export const listMockInterviewSessionsRoute: Route = async (ctx) => {
  // Get authenticated account
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // Get DurableObject instance
    const durableObjectId = ctx.env.DURABLE_MOCK_INTERVIEW.idFromName(account.accountId.toString())
    const durableMockInterview = ctx.env.DURABLE_MOCK_INTERVIEW.get(durableObjectId)

    // List all sessions for this account
    const result = await durableMockInterview.listSessions(account.accountId)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in listMockInterviewSessionsRoute:', error)
    return ctx.json({
      error: 'Failed to list sessions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
}
