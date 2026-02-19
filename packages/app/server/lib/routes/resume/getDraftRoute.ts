import type { Route } from '../../../index'

export const getDraftRoute: Route<'/api/get-draft/:templateName'> = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const templateName = ctx.req.param('templateName')

    if (!templateName) {
      return ctx.json({ error: 'Missing templateName' }, 400)
    }

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const result = await durableAccount.getDraftByTemplateName(templateName)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in getDraftRoute:', error)
    return ctx.json({
      error: 'Failed to get draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
