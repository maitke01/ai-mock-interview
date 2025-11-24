import type { Route } from '../../../index'

export const listPreferencesRoute: Route = async (ctx) => {
    try {
        // Support optional query param ?userId=...; if not provided, prefer the
        // authenticated user's id from the AUTH binding (if present).
        const url = new URL(ctx.req.url)
        const userIdParam = url.searchParams.get('userId')
        let userId = userIdParam
        try {
            if (!userId && (ctx.env as any).AUTH) {
                const account = await (ctx.env as any).AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)
                if (account && account.accountId) userId = String(account.accountId)
            }
        } catch (e) {
            // ignore auth resolution errors and fall back to provided param or no filter
            userId = userIdParam
        }

        const db = (ctx.env as any).DB
        if (!db) return ctx.json({ error: 'D1 database binding (DB) not found in environment' }, 500)

        const sql = userId
            ? `SELECT id, user_id, name, pref_text, embedding, metadata, created_at FROM job_preferences WHERE user_id = ? ORDER BY created_at DESC`
            : `SELECT id, user_id, name, pref_text, embedding, metadata, created_at FROM job_preferences ORDER BY created_at DESC`

        // Debug: log SQL and userId resolution to help diagnose intermittent D1 binding errors
        try {
            console.debug('[listPreferencesRoute] url=', ctx.req.url)
            console.debug('[listPreferencesRoute] userIdParam=', userIdParam, 'resolved userId=', userId)
            console.debug('[listPreferencesRoute] sql=', sql)
        } catch (e) { /* ignore logging errors */ }

        let stmt = db.prepare(sql)
        // Only bind when userId is non-empty (avoid binding empty string).
        // D1's bind() returns a new prepared statement, so reassign the result.
        if (userId != null && userId !== '') {
            stmt = stmt.bind(userId)
            try {
                console.debug('[listPreferencesRoute] bound userId to statement')
            } catch (e) { }
        } else {
            try { console.debug('[listPreferencesRoute] no userId to bind') } catch (e) { }
        }

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
