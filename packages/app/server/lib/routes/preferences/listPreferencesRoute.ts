import type { Route } from '../../../index'

export const listPreferencesRoute: Route = async (ctx) => {
    try {
        // ENFORCE authentication - only return preferences for the authenticated user
        const account = (ctx.env as any).AUTH ? await (ctx.env as any).AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null) : null
        if (!account || !account.accountId) {
            return ctx.json({ error: 'Unauthorized - must be logged in to view preferences' }, 401)
        }

        // ALWAYS use the authenticated user's ID - ignore any query parameters
        const userId = String(account.accountId)

        const db = (ctx.env as any).DB
        if (!db) return ctx.json({ error: 'D1 database binding (DB) not found in environment' }, 500)

        // ALWAYS filter by authenticated user's ID
        const sql = `SELECT id, user_id, name, pref_text, embedding, metadata, created_at FROM job_preferences WHERE user_id = ? ORDER BY created_at DESC`

        console.debug('[listPreferencesRoute] Fetching preferences for authenticated user:', userId)

        let stmt = db.prepare(sql).bind(userId)

        let res
        try {
            res = await stmt.all()
        } catch (err) {
            console.error('[listPreferencesRoute] stmt.all() failed', { sql, userId, err })
            throw err
        }
        const rows: any[] = res.results || []

        const parsed = rows.map((r) => {
            let metadata = null
            try {
                metadata = r.metadata ? JSON.parse(r.metadata) : null
            } catch (e) {
                metadata = r.metadata
            }
            return { id: r.id, userId: r.user_id, name: r.name, text: r.pref_text, metadata, createdAt: r.created_at }
        })

        return ctx.json({ success: true, results: parsed })
    } catch (error) {
        console.error('Error in listPreferencesRoute:', error)
        return ctx.json({ error: 'Failed to list preferences', details: error instanceof Error ? error.message : String(error) }, 500)
    }
}
