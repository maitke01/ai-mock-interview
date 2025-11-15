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

        // If we resolved a numeric userId, embed it directly to avoid D1 placeholder binding issues
        let sql: string
        if (userId && !Number.isNaN(Number(userId))) {
            const uidNum = Number(userId)
            sql = `SELECT id, user_id, name, pref_text, embedding, metadata, created_at FROM job_preferences WHERE user_id = ${uidNum} ORDER BY created_at DESC`
            try { console.debug && console.debug('listPreferencesRoute: sql (inlined userId)=', sql, 'userId=', userId) } catch (e) { }
            const stmt = db.prepare(sql)
            const res = await stmt.all()
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
        }

        // No userId filter: return all preferences
        sql = `SELECT id, user_id, name, pref_text, embedding, metadata, created_at FROM job_preferences ORDER BY created_at DESC`
        try { console.debug && console.debug('listPreferencesRoute: sql (all)=', sql) } catch (e) { }
        const stmt = db.prepare(sql)
        const res = await stmt.all()
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
