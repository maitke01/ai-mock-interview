import type { Route } from '../../../index'

export const listMockInterviewsRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const status = ctx.req.query('status')
    const upcoming = ctx.req.query('upcoming') === 'true'

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const filters: { status?: string; upcoming?: boolean } = {}
    if (status) filters.status = status
    if (upcoming) filters.upcoming = true

    const result = await durableAccount.listMockInterviews(filters)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in listMockInterviewsRoute:', error)

    return ctx.json({
      error: 'Failed to list mock interviews',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
