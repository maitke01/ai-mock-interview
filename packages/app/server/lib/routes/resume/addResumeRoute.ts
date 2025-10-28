import type { Route } from '../../../index'

export const addResumeRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const formData = await ctx.req.formData()

    const file = formData.get('file') as File | null
    const fileName = formData.get('fileName') as string

    if (!file) {
      return ctx.json({ error: 'Missing file' }, 400)
    }

    const fileData = await file.arrayBuffer()
    const originalFileName = file.name
    const fileSize = file.size
    const mimeType = file.type
    const totalPages = formData.get('totalPages') ? parseInt(formData.get('totalPages') as string) : undefined

    // Get the DurableObject instance for this account
    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    // Call the addResume method
    const result = await durableAccount.addResume({
      fileName: fileName || originalFileName,
      originalFileName,
      fileSize,
      mimeType,
      fileData,
      totalPages
    })

    return ctx.json(result)
  } catch (error) {
    console.error('Error in addResumeRoute:', error)

    return ctx.json({
      error: 'Failed to add resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
