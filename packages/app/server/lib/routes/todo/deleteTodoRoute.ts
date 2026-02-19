import type { Route } from '../../..'

export const deleteTodoRoute: Route<'/api/todo/:id'> = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const todoId = parseInt(ctx.req.param('id'), 10)
    if (isNaN(todoId)) {
      return ctx.json({ error: 'Invalid todo ID' }, 400)
    }

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)
    const result = await durableAccount.deleteTodo(todoId)

    return ctx.json(result)
  } catch (error) {
    console.error('Error deleting todo:', error)
    return ctx.json({
      error: 'Failed to delete todo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
