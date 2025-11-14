import type { Route } from '../../../index'

export const deletePreferenceRoute: Route = async (ctx) => {
  try {
    // Require authenticated user to delete preferences
    const account = (ctx.env as any).AUTH ? await (ctx.env as any).AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null) : null

    if (!account || !account.accountId) {
      return ctx.json({ error: 'Unauthorized' }, 401)
    }

    const prefId = ctx.req.param('id')
    if (!prefId) return ctx.json({ error: 'Missing preference id' }, 400)

    const db = (ctx.env as any).DB
    if (!db) return ctx.json({ error: 'D1 database binding (DB) not found in environment' }, 500)

    // verify ownership
    try {
      const row = await db.prepare('SELECT user_id FROM job_preferences WHERE id = ?').bind(prefId).first()
      if (!row) return ctx.json({ error: 'Not found' }, 404)
      const owner = row.user_id
      if (String(owner) !== String(account.accountId)) {
        return ctx.json({ error: 'Forbidden' }, 403)
      }

      await db.prepare('DELETE FROM job_preferences WHERE id = ?').bind(prefId).run()
      return ctx.json({ success: true })
    } catch (dbErr) {
      console.error('D1 error during deletePreferenceRoute:', dbErr)
      return ctx.json({ error: 'D1_ERROR', details: String(dbErr) }, 500)
    }
  } catch (error) {
    console.error('Error in deletePreferenceRoute:', error)
    return ctx.json({ error: 'Failed to delete preference', details: error instanceof Error ? error.message : String(error) }, 500)
  }
}

export default deletePreferenceRoute
