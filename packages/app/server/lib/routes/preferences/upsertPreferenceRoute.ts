import type { Route } from '../../../index'

function uuidv4() {
    // simple UUID v4 (not cryptographically strong here)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

async function embedText(ctx: any, text: string): Promise<number[]> {
    // Prefer OpenAI if OPENAI_API_KEY is available in env
    const env = (ctx as any).env || (ctx as any).ENV || {}

    if (env.OPENAI_API_KEY) {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
        })
        const j: any = await res.json()
        if (!j || !j.data || !j.data[0] || !j.data[0].embedding) throw new Error('Failed to get embedding from OpenAI')
        return j.data[0].embedding
    }

    // Fallback to Cloudflare AI binding if available
    if (env.AI && typeof env.AI.run === 'function') {
        try {
            // NOTE: model id may need to be adjusted for your account
            const aiResp = await env.AI.run('@cf/meta/text-embedding-3-small', { input: text })
            // Cloudflare AI's response shape may differ; try a couple of common keys
            if (aiResp && (aiResp.embedding || aiResp.response || aiResp.data)) {
                // try common places
                if (Array.isArray(aiResp.embedding)) return aiResp.embedding
                if (aiResp.response && Array.isArray(aiResp.response)) return aiResp.response
                if (aiResp.data && aiResp.data[0] && Array.isArray(aiResp.data[0].embedding)) return aiResp.data[0].embedding
            }
        } catch (err) {
            console.warn('Cloudflare AI embedding attempt failed', err)
        }
    }

    // If no embedding provider is configured, log a warning and return an empty embedding.
    // This allows saving preferences without an API key; search/scoring will treat empty
    // embeddings as non-matching (score 0).
    console.warn('No embedding provider configured (set OPENAI_API_KEY or provide Cloudflare AI)')
    return []
}

export const upsertPreferenceRoute: Route = async (ctx) => {
    try {
        const body = await ctx.req.json()
        const { id, userId: incomingUserId, name, text, metadata } = body
        // Try to resolve authenticated user from the AUTH binding (if present).
        // Many routes use ctx.env.AUTH.getAccount(cookie) which returns { accountId }
        let resolvedUserId: string | null = null
        try {
            const account = (ctx.env as any).AUTH ? await (ctx.env as any).AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null) : null
            if (account && account.accountId) resolvedUserId = String(account.accountId)
        } catch (e) {
            // ignore and fall back to incoming/userless flow
            resolvedUserId = null
        }
        // Prefer the authenticated id, then the incoming userId from the client, otherwise fall back to 'public'
        const userId = resolvedUserId || incomingUserId || 'public'
        if (!text || typeof text !== 'string') return ctx.json({ error: 'Missing or invalid text' }, 400)

        const prefId = id || uuidv4()
        const embedding = await embedText(ctx, text)

        const db = (ctx.env as any).DB
        if (!db) return ctx.json({ error: 'D1 database binding (DB) not found in environment' }, 500)

        const stmt = `
      INSERT INTO job_preferences (id, user_id, name, pref_text, embedding, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        name = excluded.name,
        pref_text = excluded.pref_text,
        embedding = excluded.embedding,
        metadata = excluded.metadata,
        updated_at = CURRENT_TIMESTAMP;
    `

        const embeddingStr = JSON.stringify(embedding)
        const metadataStr = metadata ? JSON.stringify(metadata) : null
        console.log('upsertPreferenceRoute: inserting preference', { prefId, userId, name, textLength: String(text).length, embeddingStrPreview: embeddingStr.slice(0, 200), metadataStrPreview: metadataStr ? metadataStr.slice(0, 200) : null })
        try {
            await db.prepare(stmt)
                .bind(prefId, userId, name || null, text, embeddingStr, metadataStr)
                .run()
        } catch (dbErr) {
            console.error('D1 error during upsert prepare/run:', dbErr)
            // Surface the DB error message/details to the client response for debugging
            return ctx.json({ error: 'D1_ERROR', details: String(dbErr) }, 500)
        }

        return ctx.json({ success: true, id: prefId })
    } catch (error) {
        console.error('Error in upsertPreferenceRoute:', error)
        return ctx.json({ error: 'Failed to upsert preference', details: error instanceof Error ? error.message : String(error) }, 500)
    }
}
