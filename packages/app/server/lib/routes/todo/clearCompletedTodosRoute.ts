import type { Route } from '../../..'

export const clearCompletedTodosRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)
    const result = await durableAccount.clearCompletedTodos()

    return ctx.json(result)
  } catch (error) {
    console.error('Error clearing completed todos:', error)
    return ctx.json({
      error: 'Failed to clear completed todos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
