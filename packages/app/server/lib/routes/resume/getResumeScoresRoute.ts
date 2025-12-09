import type { Route } from '../../../index'

/**
 * Get the most recent resume's AI scores for dashboard display
 */
export const getResumeScoresRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const result = await durableAccount.getAllResumeScores()

    return ctx.json(result)
  } catch (error) {
    console.error('Error in getResumeScoresRoute:', error)
    return ctx.json({
      error: 'Failed to get resume scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
