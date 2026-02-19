import type { Route } from '../../../index'

export const saveDraftRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{
      templateName: string
      headerContent?: string
      sidebarContent?: string
      mainContent?: string
    }>()

    const { templateName, headerContent, sidebarContent, mainContent } = body

    if (!templateName) {
      return ctx.json({ error: 'Missing templateName' }, 400)
    }

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const result = await durableAccount.saveDraftByTemplateName(templateName, {
      headerContent,
      sidebarContent,
      mainContent,
    })

    return ctx.json(result)
  } catch (error) {
    console.error('Error in saveDraftRoute:', error)
    return ctx.json({
      error: 'Failed to save draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
