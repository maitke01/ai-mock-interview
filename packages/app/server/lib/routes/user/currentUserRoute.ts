import type { Route } from '../../../index'

/**
 * Returns the currently authenticated user's information
 * This is used by the frontend to get the user ID for localStorage namespacing
 */
export const currentUserRoute: Route = async (ctx) => {
  try {
    const account = (ctx.env as any).AUTH
      ? await (ctx.env as any).AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
      : null

    if (!account || !account.accountId) {
      return ctx.json({ error: 'Not authenticated' }, 401)
    }

    return ctx.json({
      success: true,
      accountId: account.accountId,
      username: account.username || null
    })
  } catch (error) {
    console.error('Error in currentUserRoute:', error)
    return ctx.json({
      error: 'Failed to get current user',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
}
