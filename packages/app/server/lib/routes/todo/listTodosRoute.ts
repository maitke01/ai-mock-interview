import type { Route } from '../../..'

export const listTodosRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)
    const result = await durableAccount.listTodos()

    return ctx.json(result)
  } catch (error) {
    console.error('Error listing todos:', error)
    return ctx.json({
      error: 'Failed to list todos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
