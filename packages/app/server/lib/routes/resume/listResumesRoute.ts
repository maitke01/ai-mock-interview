import type { Route } from '../../../index'

export const listResumesRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    // Get the DurableObject instance for this account
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    // Call the listResumes method
    const result = await durableAccount.listResumes()

    return ctx.json(result)
  } catch (error) {
    console.error('Error in listResumesRoute:', error)

    return ctx.json({
      error: 'Failed to list resumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
