import type { Route } from '../../../index'

export const scheduleMockInterviewRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await ctx.req.json<{
      title: string
      description?: string
      scheduledDate: number
      durationMinutes?: number
      interviewType?: string
      resumeId?: number
      notes?: string
    }>()

    if (!body.title || !body.scheduledDate) {
      return ctx.json({ error: 'Missing required fields: title, scheduledDate' }, 400)
    }

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const result = await durableAccount.scheduleMockInterview(body)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in scheduleMockInterviewRoute:', error)

    return ctx.json({
      error: 'Failed to schedule mock interview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
