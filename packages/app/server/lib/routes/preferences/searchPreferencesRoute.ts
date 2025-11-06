import type { Route } from '../../../index'

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

async function embedText (ctx: any, text: string): Promise<number[]> {
  const env = (ctx as any).env || {}
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
  if (env.AI && typeof env.AI.run === 'function') {
    try {
      const aiResp = await env.AI.run('@cf/meta/text-embedding-3-small', { input: text })
      if (aiResp && (aiResp.embedding || aiResp.response || aiResp.data)) {
        if (Array.isArray(aiResp.embedding)) return aiResp.embedding
        if (aiResp.response && Array.isArray(aiResp.response)) return aiResp.response
        if (aiResp.data && aiResp.data[0] && Array.isArray(aiResp.data[0].embedding)) return aiResp.data[0].embedding
      }
    } catch (err) {
      console.warn('Cloudflare AI embedding attempt failed', err)
    }
  }
  // If no embedding provider is configured, log a warning and return an empty embedding.
  // This lets searches run without embeddings; scores will be 0 for entries without embeddings.
  console.warn('No embedding provider configured')
  return []
}

export const searchPreferencesRoute: Route = async (ctx) => {
  try {
    const { query, topK = 5, userId } = await ctx.req.json()
    if (!query || typeof query !== 'string') return ctx.json({ error: 'Missing query' }, 400)

    const qEmb = await embedText(ctx, query)

    const db = (ctx.env as any).DB
    if (!db) return ctx.json({ error: 'D1 database binding (DB) not found in environment' }, 500)

    // Fetch candidates (for small scale, fetch all or filter by userId)
    const sql = userId
      ? `SELECT id, user_id, name, pref_text, embedding, metadata FROM job_preferences WHERE user_id = ?`
      : `SELECT id, user_id, name, pref_text, embedding, metadata FROM job_preferences`

    const stmt = db.prepare(sql)
    if (userId) stmt.bind(userId)
    const res = await stmt.all()
    const rows: any[] = res.results || []

    const scored = rows.map((r) => {
      let emb: number[] = []
      try {
        emb = JSON.parse(r.embedding || '[]')
      } catch (e) {
        emb = []
      }
      const score = emb.length === qEmb.length ? cosineSimilarity(qEmb, emb) : 0
      return { row: r, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, topK).map((s) => ({ id: s.row.id, userId: s.row.user_id, name: s.row.name, text: s.row.pref_text, metadata: s.row.metadata, score: s.score }))

    return ctx.json({ success: true, results: top })
  } catch (error) {
    console.error('Error in searchPreferencesRoute:', error)
    return ctx.json({ error: 'Failed to search preferences', details: error instanceof Error ? error.message : String(error) }, 500)
  }
}
