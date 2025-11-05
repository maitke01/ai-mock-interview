import type { Route } from '../../../index'

export const deleteResumeRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const { resumeId } = await ctx.req.json()

    if (!resumeId || typeof resumeId !== 'number') {
      return ctx.json({ error: 'Missing or invalid resumeId' }, 400)
    }

    // Get the DurableObject instance for this account
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    // Call the deleteResume method
    const result = await durableAccount.deleteResume(resumeId)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in deleteResumeRoute:', error)

    return ctx.json({
      error: 'Failed to delete resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
