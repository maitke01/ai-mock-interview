import type { Route } from '../../../index'

// Dev-only route: echoes request headers for debugging CORS/cookie issues.
export const headerEchoRoute: Route = async (ctx) => {
    try {
        const headersObj: Record<string, string> = {}
        // Hono's request wrapper exposes the underlying Fetch `Request` as
        // `ctx.req.raw`. Use its `headers` iterator to collect all headers.
        const rawReq = (ctx.req as any).raw as Request | undefined
        const hdrs = rawReq?.headers ?? new Headers()
        for (const [k, v] of hdrs.entries()) headersObj[k] = v
        return ctx.json({ success: true, headers: headersObj })
    } catch (e) {
        return ctx.json({ success: false, error: 'Failed to read headers', details: e instanceof Error ? e.message : String(e) }, 500)
    }
}
