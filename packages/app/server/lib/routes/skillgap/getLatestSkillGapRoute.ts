import type { Route } from '../../../index'

export const getLatestSkillGapRoute: Route = async (ctx) => {
  const account = await ctx.env.AUTH.getAccount(ctx.req.header('Cookie')).catch(() => null)

  if (account === null) {
    return ctx.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const db = ctx.env.DB
    if (!db) {
      return ctx.json({ error: 'Database not available' }, 500)
    }

    const userId = account.accountId.toString()

    const stmt = `
      SELECT id, metadata, created_at, updated_at
      FROM job_preferences
      WHERE user_id = ? AND name = 'Skill Gap Analysis'
      ORDER BY updated_at DESC
      LIMIT 1;
    `

    const row = await db.prepare(stmt).bind(userId).first()

    if (!row) {
      return ctx.json({ success: true, result: null }, 200)
    }

    let parsed: Record<string, unknown> = {}
    try {
      if (row.metadata && typeof row.metadata === 'string') {
        parsed = JSON.parse(row.metadata)
      }
    } catch (e) {
      console.warn('Failed to parse skill gap metadata', e)
    }

    return ctx.json({
      success: true,
      result: {
        id: row.id,
        keywordMatch: parsed.keywordMatch ?? 0,
        matchedSkills: parsed.matchedSkills ?? [],
        missingSkills: parsed.missingSkills ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })
  } catch (error) {
    console.error('Error in getLatestSkillGapRoute:', error)
    return ctx.json({
      error: 'Failed to fetch skill gap result',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
