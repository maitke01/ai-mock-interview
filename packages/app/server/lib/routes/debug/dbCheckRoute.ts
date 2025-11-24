import type { Route } from '../../../index'

export const dbCheckRoute: Route = async (ctx) => {
    try {
        const db = (ctx.env as any).DB
        if (!db) return ctx.json({ success: false, error: 'DB binding not found' }, 500)
        try {
            const stmt = db.prepare('SELECT 1 as ok')
            const res = await stmt.all()
            return ctx.json({ success: true, result: res })
        } catch (dbErr) {
            console.error('D1 check error:', dbErr)
            return ctx.json({ success: false, error: 'D1_ERROR', details: String(dbErr) }, 500)
        }
    } catch (err) {
        console.error('dbCheckRoute error:', err)
        return ctx.json({ success: false, error: 'Unexpected', details: String(err) }, 500)
    }
}

export default dbCheckRoute
