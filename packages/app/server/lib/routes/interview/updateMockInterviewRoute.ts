import type { Route } from '../../../index'

export const updateMockInterviewRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const interviewId = ctx.req.param('id')

    if (!interviewId) {
      return ctx.json({ error: 'Missing interview ID' }, 400)
    }

    const body = await ctx.req.json<{
      title?: string
      description?: string
      scheduledDate?: number
      durationMinutes?: number
      interviewType?: string
      status?: string
      resumeId?: number
      notes?: string
      feedback?: string
    }>()

    const durableObjectId = ctx.env.DURABLE_ACCOUNT.idFromName(account.accountId.toString())
    const durableAccount = ctx.env.DURABLE_ACCOUNT.get(durableObjectId)

    const result = await durableAccount.updateMockInterview(parseInt(interviewId), body)

    return ctx.json(result)
  } catch (error) {
    console.error('Error in updateMockInterviewRoute:', error)

    return ctx.json({
      error: 'Failed to update mock interview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
