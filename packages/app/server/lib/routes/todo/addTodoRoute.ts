import type { Route } from '../../..'

export const addTodoRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{
      text: string
      priority?: 'low' | 'medium' | 'high'
    }>()

    if (!body.text || typeof body.text !== 'string') {
      return ctx.json({ error: 'Text is required' }, 400)
    }

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)
    const result = await durableAccount.addTodo({
      text: body.text,
      priority: body.priority
    })

    return ctx.json(result)
  } catch (error) {
    console.error('Error adding todo:', error)
    return ctx.json({
      error: 'Failed to add todo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
