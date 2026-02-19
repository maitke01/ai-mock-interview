import type { Route } from '../../../index'

export const saveExtractedTextRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{ resumeId: number; extractedText: string }>()

    if (!body.resumeId || typeof body.extractedText !== 'string') {
      return ctx.json({ error: 'Missing resumeId or extractedText' }, 400)
    }

    // Get the DurableObject instance for this account
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    // Call the saveExtractedText method
    const result = await durableAccount.saveExtractedText(body.resumeId, body.extractedText)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in saveExtractedTextRoute:', error)

    return ctx.json({
      error: 'Failed to save extracted text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
