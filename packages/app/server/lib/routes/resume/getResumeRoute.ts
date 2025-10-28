import type { Route } from '../../../index'

export const getResumeRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const resumeId = ctx.req.param('id')

    if (!resumeId) {
      return ctx.json({ error: 'Missing resumeId' }, 400)
    }

    // Get the DurableObject instance for this account
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    // Call the getResume method
    const result = await durableAccount.getResume(parseInt(resumeId))

    return ctx.json(result)
  } catch (error) {
    console.error('Error in getResumeRoute:', error)

    return ctx.json({
      error: 'Failed to get resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
